/**
 * Training Management System - AI Assist Service (Claude API)
 *
 * Two narrow, human-in-the-loop assists over the SF-182 form - both return a
 * *suggestion* the employee reviews and edits before submitting, never a
 * value written directly into a request:
 *
 *  - draftSkillLearningObjective: a first-pass draft of the Section B
 *    "Skill/Learning Objective" justification (item 20 on the paper form).
 *  - suggestTrainingCodes: best-guess Purpose/Type/Sub-Type/Delivery/Source
 *    classification codes, the most confusing part of the real SF-182 form.
 *
 * Optional feature: if ANTHROPIC_API_KEY isn't set, both functions throw
 * AnthropicNotConfiguredError and the route handlers turn that into a 503
 * rather than failing server startup or the rest of the app.
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  TRAINING_PURPOSE_TYPES,
  TRAINING_TYPE_CODES,
  TRAINING_SUB_TYPE_CODES,
  TRAINING_DELIVERY_TYPE_CODES,
  TRAINING_SOURCE_TYPE_CODES,
  validateCode,
  validateSubTypeCode,
} from './sf182Codes';

export class AnthropicNotConfiguredError extends Error {
  constructor() {
    super('ANTHROPIC_API_KEY is not configured on this server');
    this.name = 'AnthropicNotConfiguredError';
  }
}

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new AnthropicNotConfiguredError();
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

const MODEL = 'claude-opus-5';

// ─── Draft the Skill/Learning Objective justification ──────────────────────

export interface DraftObjectiveInput {
  courseTitle: string;
  vendorName?: string;
  positionTitle?: string;
  /** Employee's own rough notes on why they want this training. */
  notes?: string;
}

export async function draftSkillLearningObjective(input: DraftObjectiveInput): Promise<string> {
  const anthropic = getClient();

  const context = [
    `Course: ${input.courseTitle}`,
    input.vendorName && `Provider: ${input.vendorName}`,
    input.positionTitle && `Employee's position: ${input.positionTitle}`,
    input.notes && `Employee's notes on why they want this training: ${input.notes}`,
  ].filter(Boolean).join('\n');

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    output_config: { effort: 'low' },
    system: [
      'You draft the "Skill/Learning Objective" justification for a U.S. federal employee\'s',
      'SF-182 training request form. Write 2-4 sentences, first person, professional and concrete:',
      'what skill or knowledge gap this training addresses and how it connects to the employee\'s',
      'job duties or agency mission. No headers, no bullet points, no placeholder brackets - just',
      'the justification text as it would appear on the form. If the employee\'s notes already give',
      'you enough to work with, use their own reasoning rather than inventing a generic one.',
    ].join(' '),
    messages: [{ role: 'user', content: context }],
  });

  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
  return (textBlock?.text ?? '').trim();
}

// ─── Suggest SF-182 classification codes ────────────────────────────────────

export interface SuggestCodesInput {
  courseTitle: string;
  vendorName?: string;
  /** e.g. "self-paced online course", "3-day in-person workshop" */
  deliveryDescription?: string;
}

export interface SuggestedCodes {
  trainingPurposeType: string | null;
  trainingTypeCode: string | null;
  trainingSubTypeCode: string | null;
  trainingDeliveryTypeCode: string | null;
  trainingSourceType: string | null;
  /** One-sentence explanation shown to the employee so they can sanity-check the picks. */
  rationale: string;
}

const codeTableForPrompt = (list: { code: string; label: string }[]) =>
  list.map((o) => `${o.code}=${o.label}`).join('; ');

const CODE_SCHEMA = {
  type: 'object',
  properties: {
    trainingPurposeType: { type: 'string', enum: TRAINING_PURPOSE_TYPES.map((o) => o.code) },
    trainingTypeCode: { type: 'string', enum: TRAINING_TYPE_CODES.map((o) => o.code) },
    trainingSubTypeCode: { type: 'string' },
    trainingDeliveryTypeCode: { type: 'string', enum: TRAINING_DELIVERY_TYPE_CODES.map((o) => o.code) },
    trainingSourceType: { type: 'string', enum: TRAINING_SOURCE_TYPE_CODES.map((o) => o.code) },
    rationale: { type: 'string' },
  },
  required: [
    'trainingPurposeType', 'trainingTypeCode', 'trainingSubTypeCode',
    'trainingDeliveryTypeCode', 'trainingSourceType', 'rationale',
  ],
  additionalProperties: false,
} as const;

export async function suggestTrainingCodes(input: SuggestCodesInput): Promise<SuggestedCodes> {
  const anthropic = getClient();

  const subTypeTable = Object.entries(TRAINING_SUB_TYPE_CODES)
    .map(([typeCode, list]) => `  under type ${typeCode}: ${codeTableForPrompt(list)}`)
    .join('\n');

  const context = [
    `Course: ${input.courseTitle}`,
    input.vendorName && `Provider: ${input.vendorName}`,
    input.deliveryDescription && `How it's delivered: ${input.deliveryDescription}`,
  ].filter(Boolean).join('\n');

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    output_config: {
      effort: 'low',
      format: { type: 'json_schema', schema: CODE_SCHEMA },
    },
    system: [
      'You classify a training course against the OPM Standard Form 182 code tables.',
      'Purpose type codes: ' + codeTableForPrompt(TRAINING_PURPOSE_TYPES) + '.',
      'Type codes: ' + codeTableForPrompt(TRAINING_TYPE_CODES) + '.',
      'Sub-type codes (must match the chosen type code):\n' + subTypeTable,
      'Delivery type codes: ' + codeTableForPrompt(TRAINING_DELIVERY_TYPE_CODES) + '.',
      'Source type codes: ' + codeTableForPrompt(TRAINING_SOURCE_TYPE_CODES) + '.',
      'Pick the single best code from each table for the course described by the user.',
      'If delivery isn\'t described, infer the most likely delivery method from the course itself.',
      'Give a one-sentence rationale a federal employee can quickly sanity-check.',
    ].join('\n'),
    messages: [{ role: 'user', content: context }],
  });

  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
  const parsed = JSON.parse(textBlock?.text ?? '{}');

  // Never trust the model's codes onto the form unvalidated - clamp each one
  // against the real tables and drop anything that doesn't match.
  const trainingTypeCode = validateCode(TRAINING_TYPE_CODES, parsed.trainingTypeCode);
  return {
    trainingPurposeType: validateCode(TRAINING_PURPOSE_TYPES, parsed.trainingPurposeType),
    trainingTypeCode,
    trainingSubTypeCode: trainingTypeCode ? validateSubTypeCode(trainingTypeCode, parsed.trainingSubTypeCode) : null,
    trainingDeliveryTypeCode: validateCode(TRAINING_DELIVERY_TYPE_CODES, parsed.trainingDeliveryTypeCode),
    trainingSourceType: validateCode(TRAINING_SOURCE_TYPE_CODES, parsed.trainingSourceType),
    rationale: typeof parsed.rationale === 'string' ? parsed.rationale : '',
  };
}
