
const EMAIL_REGEX =
  /^(?=.{1,254}$)(?=.{1,64}@)[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/;

export function isValidEmail(email) {
  if (typeof email !== "string") {
    return false;
  }

  return EMAIL_REGEX.test(email.trim());
}

export function getEmailError(email, required = true) {
  const value = email.trim();

  if (!value) {
    return required ? "Email address is required." : "";
  }

  if (value.length > 254) {
    return "Email address cannot exceed 254 characters.";
  }

  if (!isValidEmail(value)) {
    return "Enter a valid email, for example name@gmail.com.";
  }

  return "";
}
