import { MapPin, RotateCw, WifiOff } from "lucide-react";
import Image from "next/image";
import styles from "./HomeLoading.module.css";

export default function HomeLoading({ retry }: { retry?: () => void }) {
  return (
    <main className={styles.screen}>
      <div className={styles.contours} aria-hidden="true" />
      <section aria-labelledby="home-loading-title" className={styles.panel}>
        <div className={styles.emblem} aria-hidden="true">
          <Image src="/logo.jpg" alt="" width={64} height={64} loading="eager" />
          <span><MapPin size={15} /></span>
        </div>
        <h1 id="home-loading-title" className={styles.title}>HueDiMo</h1>
        {retry ? (
          <div className={styles.status}>
            <p role="alert"><WifiOff size={17} aria-hidden="true" /> Không thể tải dữ liệu bản đồ.</p>
            <button type="button" onClick={retry} className={styles.retry}>
              <RotateCw size={17} aria-hidden="true" />
              Tải lại bản đồ
            </button>
          </div>
        ) : (
          <div className={styles.status}>
            <p role="status" id="home-loading-status">Đang tải bản đồ và địa điểm…</p>
            <div role="progressbar" aria-labelledby="home-loading-status" className={styles.track}>
              <span aria-hidden="true" />
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
