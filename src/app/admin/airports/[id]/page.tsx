import styles from "./EditAirportPage.module.css";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import AirportForm from "@/components/admin/AirportForm/AirportForm";
import Arrow from "@/components/shared/icons/Arrow/Arrow";
import DirtyFormProvider from "@/components/shared/DirtyFormProvider/DirtyFormProvider";
import {
  updateAirport,
  deleteAirport,
} from "../../../../../actions/admin/airports";
import { getCompanySettings } from "../../../../../actions/admin/companySettings";
import { formatDateTime } from "@/lib/timezone";
import DeleteAirportClient from "./DeleteAirportClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function EditAirportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!id) notFound();

  const { timezone } = await getCompanySettings();

  const airport = await db.airport.findUnique({
    where: { id },
    include: {
      services: {
        select: { id: true, name: true, slug: true, active: true },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!airport) notFound();

  async function updateAction(formData: FormData) {
    "use server";
    return updateAirport(id, formData);
  }

  async function deleteAction(): Promise<{ ok?: boolean; error?: string }> {
    "use server";
    try {
      await deleteAirport(id);
      return { ok: true };
    } catch {
      return { error: "Failed to delete airport." };
    }
  }

  const hasCoords =
    airport.lat !== null &&
    airport.lng !== null &&
    !airport.lat.isZero() &&
    !airport.lng.isZero();

  return (
    <DirtyFormProvider>
      <section className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <Link href='/admin/airports' className={`${styles.backBtn} backBtn`}>
            <Arrow className='backArrow' /> Back to airports
          </Link>
          <div className={styles.headerTop}>
            <div className={styles.top}>
              <div className={styles.profileInfo}>
                <h1 className={`${styles.heading} h2`}>
                  Airport: <b>{airport.name}</b>
                </h1>
                <div className={styles.badgesRow}>
                  <span
                    className={`badge ${airport.active ? "badge_good" : "badge_neutral"}`}
                  >
                    {airport.active ? "Active" : "Inactive"}
                  </span>
                  <span className='badge badge_accent'>{airport.iata}</span>
                  {airport.services.length > 0 && (
                    <span className='badge badge_neutral'>
                      {airport.services.length} service
                      {airport.services.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Info Cards Grid */}
        <div className={styles.grid}>
          {/* Airport Details Card */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className='cardTitle h4'>Airport Details</h2>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Name</span>
                <span className={styles.infoValue}>{airport.name}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>IATA Code</span>
                <span className={`${styles.infoValue} ${styles.mono}`}>
                  {airport.iata}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Status</span>
                <span
                  className={`badge ${airport.active ? "badge_good" : "badge_neutral"}`}
                >
                  {airport.active ? "Active" : "Inactive"}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Sort Order</span>
                <span className={styles.infoValue}>{airport.sortOrder}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Added</span>
                <span className={styles.infoValue}>
                  {formatDateTime(airport.createdAt, timezone)}{" "}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Airport ID</span>
                <span className={`${styles.infoValue} ${styles.mono}`}>
                  {airport.id}
                </span>
              </div>
            </div>
          </div>

          {/* Location Card */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className='cardTitle h4'>Location</h2>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Address</span>
                <span className={styles.infoValue}>
                  {airport.address || "—"}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Place ID</span>
                <span className={`${styles.infoValue} ${styles.mono}`}>
                  {airport.placeId || "—"}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Latitude</span>
                <span className={`${styles.infoValue} ${styles.mono}`}>
                  {airport.lat != null ? String(airport.lat) : "—"}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Longitude</span>
                <span className={`${styles.infoValue} ${styles.mono}`}>
                  {airport.lng != null ? String(airport.lng) : "—"}
                </span>
              </div>
              {hasCoords && (
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Map</span>
                  <a
                    href={`https://www.google.com/maps?q=${airport.lat},${airport.lng}`}
                    target='_blank'
                    rel='noopener noreferrer'
                    className={styles.mapLink}
                  >
                    Open in Google Maps ↗
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Linked Services */}
        {airport.services.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className='h2 underline'>Linked Services</h2>
              <p className='miniNote'>
                Service types that include this airport in their configuration
              </p>
            </div>
            <div className={styles.tableCard}>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead className={styles.thead}>
                    <tr className={styles.trHead}>
                      <th className={styles.th}>Service Name</th>
                      <th className={styles.th}>Slug</th>
                      <th className={styles.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {airport.services.map((svc) => {
                      const href = `/admin/services/${svc.id}`;
                      return (
                        <tr
                          key={svc.id}
                          className={`${styles.tr} ${!svc.active ? styles.trInactive : ""}`}
                        >
                          <td
                            className={styles.td}
                            data-label='Service'
                            style={{ position: "relative" }}
                          >
                            <Link
                              href={href}
                              className={styles.rowStretchedLink}
                              aria-label='Open service'
                              style={{
                                position: "absolute",
                                inset: 0,
                                zIndex: 5,
                              }}
                            />
                            <Link href={href} className={styles.rowLink}>
                              {svc.name}
                            </Link>
                          </td>
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
                              style={{
                                position: "absolute",
                                inset: 0,
                                zIndex: 5,
                              }}
                            />
                            <span className={styles.mono}>{svc.slug}</span>
                          </td>
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
                              style={{
                                position: "absolute",
                                inset: 0,
                                zIndex: 5,
                              }}
                            />
                            <span
                              className={`badge ${svc.active ? "badge_good" : "badge_neutral"}`}
                            >
                              {svc.active ? "Active" : "Inactive"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Edit Form */}
        <div className={styles.section} id='airport-form'>
          <div className={styles.sectionHeader}>
            <h2 className='h2 underline'>Edit Airport</h2>
            <p className='miniNote'>
              Update airport details used in BookingWizard dropdowns
            </p>
          </div>
          <div className={styles.card}>
            <div className={styles.cardBody}>
              <AirportForm
                action={updateAction}
                initial={{
                  name: airport.name,
                  iata: airport.iata,
                  address: airport.address,
                  placeId: airport.placeId ?? "",
                  sortOrder: airport.sortOrder,
                  active: airport.active,
                  lat: airport.lat ? String(airport.lat) : "",
                  lng: airport.lng ? String(airport.lng) : "",
                }}
                submitLabel='Save changes'
                mode='edit'
              />
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <DeleteAirportClient
          airportId={airport.id}
          airportName={airport.name}
          onDelete={deleteAction}
        />
      </section>
    </DirtyFormProvider>
  );
}
