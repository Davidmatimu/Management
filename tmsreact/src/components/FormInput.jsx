import "./FormInput.css";

const FormInput = (props) => {
    return (
        <div className="formInput">
            {/*<label>{props.label}</label>*/}
            <input placeholder={props.placeholder} ref={props.inputRef} type={props.type} />
        </div>
    )
}

export default FormInput;
