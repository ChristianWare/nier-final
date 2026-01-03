import Logo from '../Logo/Logo';
import styles from './LoadingPulse.module.css' 
 
 export default function LoadingPulse() {
   return (
     <div className={styles.container}>
       <Logo className={styles.thunderIcon} />
     </div>
   );
 }