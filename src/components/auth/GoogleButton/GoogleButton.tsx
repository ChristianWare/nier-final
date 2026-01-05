import styles from "./GoogleButton.module.css";
import GoogleIcon from "@/components/icons/GoogleIcon/GoogleIcon";
// import { signIn } from "next-auth/react";
// import { LOGIN_REDIRECT } from "../../../../routes";
import { useActionState } from "react";
import { googleAuthenticate } from "../../../../actions/auth/google-login";


interface Props {
  title: string;
}

export default function GoogleButton({ title }: Props) {
  const [errorMsgGoogle, dispatchGoogle] = useActionState(
    googleAuthenticate,
    undefined
  );


  return (
    <form action={dispatchGoogle} className={styles.form}>
      <button type='submit' className={styles.googleBtn}>
        <GoogleIcon className={styles.google} />
        <span className={styles.googleBtnText}>Sign {title} with Google</span>
      </button>
      <p>{errorMsgGoogle}</p>
    </form>
  );
}
