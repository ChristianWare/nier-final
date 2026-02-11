import styles from "./ServicesPage.module.css";
import { db } from "@/lib/db";
import Link from "next/link";
import Button from "@/components/shared/Button/Button";
import ServiceActionsClient from "./ServiceActionsClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminServicesPage() {
  const services = await db.serviceType.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return (
    <section className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.top}>
            <h1 className={`${styles.heading} h2`}>Services</h1>
          </div>

          <div className={styles.headerActions}>
            <Button
              href='/admin/services/new'
              text='New Service'
              btnType='greenReg'
            />
          </div>

          <div className={styles.meta}>
            <strong style={{ fontSize: "1.4rem" }}>{services.length}</strong>{" "}
            total
          </div>
        </div>
      </header>

      {services.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>No services found.</p>
          <p className={styles.emptyCopy}>
            Add your first service to get started.
          </p>
          <Button
            href='/admin/services/new'
            text='Add Service'
            btnType='blackReg'
          />
        </div>
      ) : (
        <div className={styles.tableCard}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead className={styles.thead}>
                <tr className={styles.trHead}>
                  <th className={styles.th}>Name</th>
                  <th className={styles.th}>Slug</th>
                  <th className={styles.th}>Strategy</th>
                  <th className={styles.th}>Status</th>
                  <th className={styles.th}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {services.map((s) => {
                  const href = `/admin/services/${s.id}`;

                  return (
                    <tr
                      key={s.id}
                      className={`${styles.tr} ${!s.active ? styles.trInactive : ""}`}
                    >
                      {/* Name */}
                      <td
                        className={styles.td}
                        data-label='Name'
                        style={{ position: "relative" }}
                      >
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-label='Open service'
                          style={{ position: "absolute", inset: 0, zIndex: 5 }}
                        />
                        <div className={styles.cellStrong}>{s.name}</div>
                      </td>

                      {/* Slug */}
                      <td
                        className={styles.td}
                        data-label='Slug'
                        style={{ position: "relative" }}
                      >
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-hidden='true'
                          tabIndex={-1}
                          style={{ position: "absolute", inset: 0, zIndex: 5 }}
                        />
                        <span className={styles.cellSub}>{s.slug}</span>
                      </td>

                      {/* Strategy */}
                      <td
                        className={styles.td}
                        data-label='Strategy'
                        style={{ position: "relative" }}
                      >
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-hidden='true'
                          tabIndex={-1}
                          style={{ position: "absolute", inset: 0, zIndex: 5 }}
                        />
                        <span className={styles.pill}>{s.pricingStrategy}</span>
                      </td>

                      {/* Status */}
                      <td
                        className={styles.td}
                        data-label='Status'
                        style={{ position: "relative" }}
                      >
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-hidden='true'
                          tabIndex={-1}
                          style={{ position: "absolute", inset: 0, zIndex: 5 }}
                        />
                        <span
                          className={`badge ${s.active ? "badge_good" : "badge_neutral"}`}
                        >
                          {s.active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td
                        className={styles.td}
                        data-label='Actions'
                        style={{ position: "relative", zIndex: 10 }}
                      >
                        <ServiceActionsClient
                          id={s.id}
                          active={s.active}
                          editHref={href}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
