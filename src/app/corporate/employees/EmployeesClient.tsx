"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import styles from "./CorporateEmployees.module.css";
import Modal from "@/components/shared/Modal/Modal";
import {
  addEmployee,
  editEmployee,
  toggleEmployeeActive,
} from "../../../../actions/corporate/corporateEmployeeActions";

/* ─────────────────────────────────────────────
   Types
   ───────────────────────────────────────────── */

type Employee = {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  employeeId: string;
  active: boolean;
  createdAt: string;
  ridesThisMonth: number;
  ridesAllTime: number;
};

type Props = {
  employees: Employee[];
  activeCount: number;
  totalCount: number;
  departments: string[];
  accountId: string;
};

type EmployeeForm = {
  name: string;
  email: string;
  phone: string;
  department: string;
  employeeId: string;
};

const EMPTY_FORM: EmployeeForm = {
  name: "",
  email: "",
  phone: "",
  department: "",
  employeeId: "",
};

/* ─────────────────────────────────────────────
   Component
   ───────────────────────────────────────────── */

export default function EmployeesClient({
  employees,
  activeCount,
  totalCount,
  departments,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // ─── Filters ───
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ACTIVE" | "INACTIVE"
  >("ALL");

  // ─── Add Modal ───
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<EmployeeForm>({ ...EMPTY_FORM });

  // ─── Edit Modal ───
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EmployeeForm>({ ...EMPTY_FORM });

  // ─── Filtered list ───
  const filtered = useMemo(() => {
    let list = employees;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q) ||
          e.phone.toLowerCase().includes(q) ||
          e.department.toLowerCase().includes(q) ||
          e.employeeId.toLowerCase().includes(q),
      );
    }

    if (deptFilter !== "ALL") {
      list = list.filter((e) => e.department === deptFilter);
    }

    if (statusFilter === "ACTIVE") {
      list = list.filter((e) => e.active);
    } else if (statusFilter === "INACTIVE") {
      list = list.filter((e) => !e.active);
    }

    return list;
  }, [employees, search, deptFilter, statusFilter]);

  // ─── Handlers ───

  function handleAdd() {
    if (!addForm.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    startTransition(async () => {
      const res = await addEmployee({
        name: addForm.name.trim(),
        email: addForm.email.trim() || undefined,
        phone: addForm.phone.trim() || undefined,
        department: addForm.department.trim() || undefined,
        employeeId: addForm.employeeId.trim() || undefined,
      });
      if (res.ok) {
        toast.success("Employee added.");
        setAddOpen(false);
        setAddForm({ ...EMPTY_FORM });
        router.refresh();
      } else {
        toast.error(res.error ?? "Failed.");
      }
    });
  }

  function openEdit(emp: Employee) {
    setEditId(emp.id);
    setEditForm({
      name: emp.name,
      email: emp.email,
      phone: emp.phone,
      department: emp.department,
      employeeId: emp.employeeId,
    });
    setEditOpen(true);
  }

  function handleEdit() {
    if (!editId) return;
    if (!editForm.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    startTransition(async () => {
      const res = await editEmployee(editId!, {
        name: editForm.name.trim(),
        email: editForm.email.trim() || undefined,
        phone: editForm.phone.trim() || undefined,
        department: editForm.department.trim() || undefined,
        employeeId: editForm.employeeId.trim() || undefined,
      });
      if (res.ok) {
        toast.success("Employee updated.");
        setEditOpen(false);
        setEditId(null);
        router.refresh();
      } else {
        toast.error(res.error ?? "Failed.");
      }
    });
  }

  function handleToggle(emp: Employee) {
    const verb = emp.active ? "deactivate" : "reactivate";
    if (!window.confirm(`Are you sure you want to ${verb} ${emp.name}?`))
      return;

    startTransition(async () => {
      const res = await toggleEmployeeActive(emp.id, !emp.active);
      if (res.ok) {
        toast.success(
          emp.active ? "Employee deactivated." : "Employee reactivated.",
        );
        router.refresh();
      } else {
        toast.error(res.error ?? "Failed.");
      }
    });
  }

  // ─── Form Fields (shared between add/edit) ───

  function renderForm(
    form: EmployeeForm,
    setForm: React.Dispatch<React.SetStateAction<EmployeeForm>>,
  ) {
    return (
      <div className={styles.formGrid}>
        <div className={styles.formField}>
          <label className={styles.formLabel}>Name *</label>
          <input
            type='text'
            className='inputBorder'
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder='Full name'
          />
        </div>
        <div className={styles.formField}>
          <label className={styles.formLabel}>Email</label>
          <input
            type='email'
            className='inputBorder'
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder='email@example.com'
          />
        </div>
        <div className={styles.formField}>
          <label className={styles.formLabel}>Phone</label>
          <input
            type='tel'
            className='inputBorder'
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder='(555) 123-4567'
          />
        </div>
        <div className={styles.formField}>
          <label className={styles.formLabel}>Department</label>
          <input
            type='text'
            className='inputBorder'
            value={form.department}
            onChange={(e) =>
              setForm((f) => ({ ...f, department: e.target.value }))
            }
            placeholder='e.g. Marketing'
          />
        </div>
        <div className={styles.formField}>
          <label className={styles.formLabel}>Employee ID</label>
          <input
            type='text'
            className='inputBorder'
            value={form.employeeId}
            onChange={(e) =>
              setForm((f) => ({ ...f, employeeId: e.target.value }))
            }
            placeholder='Internal ID (optional)'
          />
        </div>
      </div>
    );
  }

  // ─── Render ───

  return (
    <section className={styles.content}>
      {/* ─── Header ─── */}
      <div className={styles.header}>
        <div>
          <h2 className='h3'>Employees</h2>
          <p className={styles.meta}>
            <strong>{activeCount}</strong> active · {totalCount} total on roster
          </p>
        </div>
        <button className='goodBtnii' onClick={() => setAddOpen(true)}>
          + Add Employee
        </button>
      </div>

      {/* ─── Filters ─── */}
      <div className={styles.filters}>
        <input
          type='text'
          className={`inputBorder ${styles.searchInput}`}
          placeholder='Search by name, email, department…'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className={styles.filterGroup}>
          <select
            className={`selectBorder emptySmall ${styles.selectInput}`}
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "ALL" | "ACTIVE" | "INACTIVE")
            }
          >
            <option value='ALL'>All Statuses</option>
            <option value='ACTIVE'>Active Only</option>
            <option value='INACTIVE'>Inactive Only</option>
          </select>

          {departments.length > 0 && (
            <select
              className={`selectBorder emptySmall ${styles.selectInput}`}
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
            >
              <option value='ALL'>All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* ─── Table ─── */}
      {filtered.length === 0 ? (
        <div className={styles.emptyState}>
          {employees.length === 0 ? (
            <>
              <p className={styles.emptyTitle}>No employees yet</p>
              <p className={styles.emptySub}>
                Add employees to your roster so you can book rides for them.
              </p>
              <button className='goodBtnii' onClick={() => setAddOpen(true)}>
                + Add Your First Employee
              </button>
            </>
          ) : (
            <p className={styles.emptyTitle}>
              No employees match your filters.
            </p>
          )}
        </div>
      ) : (
        <div className={styles.tableCard}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead className={styles.thead}>
                <tr className={styles.trHead}>
                  <th className={styles.th}>Name</th>
                  <th className={styles.th}>Contact</th>
                  <th className={styles.th}>Department</th>
                  <th className={styles.th}>Rides This Month</th>
                  <th className={styles.th}>Total Rides</th>
                  <th className={styles.th}>Status</th>
                  <th className={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp) => (
                  <tr key={emp.id} className={styles.tr}>
                    <td className={styles.td}>
                      <span className={styles.cellStrong}>{emp.name}</span>
                      {emp.employeeId && (
                        <span className={styles.cellSub}>
                          ID: {emp.employeeId}
                        </span>
                      )}
                    </td>
                    <td className={styles.td}>
                      {emp.email && (
                        <span className={styles.cellStrong}>{emp.email}</span>
                      )}
                      {emp.phone && (
                        <span className={styles.cellSub}>{emp.phone}</span>
                      )}
                      {!emp.email && !emp.phone && (
                        <span className={styles.cellSub}>—</span>
                      )}
                    </td>
                    <td className={styles.td}>
                      {emp.department || (
                        <span className={styles.cellSub}>—</span>
                      )}
                    </td>
                    <td className={styles.td}>{emp.ridesThisMonth}</td>
                    <td className={styles.td}>{emp.ridesAllTime}</td>
                    <td className={styles.td}>
                      <span
                        className={`${styles.badge} ${
                          emp.active ? styles.badgeGreen : styles.badgeNeutral
                        }`}
                      >
                        {emp.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className={styles.td}>
                      <div className={styles.actionBtns}>
                        <button
                          className='neutralBtn'
                          onClick={() => openEdit(emp)}
                          disabled={isPending}
                        >
                          Edit
                        </button>
                        <button
                          className={emp.active ? "warningBtn" : "goodBtn"}
                          onClick={() => handleToggle(emp)}
                          disabled={isPending}
                        >
                          {emp.active ? "Deactivate" : "Reactivate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.tableFooter}>
            Showing {filtered.length} of {employees.length} employee
            {employees.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}

      {/* ─── Add Modal ─── */}
      {addOpen && (
        <Modal isOpen={addOpen} onClose={() => setAddOpen(false)}>
          <div className={styles.modalContent}>
            <h3 className='h4'>Add Employee</h3>
            <p className={styles.modalSub}>
              Add someone to your roster so you can book rides for them.
              Employees don&apos;t get login access — they&apos;re contacts for
              booking purposes.
            </p>
            {renderForm(addForm, setAddForm)}
            <div className={styles.modalActions}>
              <button
                className='goodBtnii'
                onClick={handleAdd}
                disabled={isPending}
              >
                {isPending ? "Adding…" : "Add Employee"}
              </button>
              <button
                className='neutralBtn'
                onClick={() => setAddOpen(false)}
                disabled={isPending}
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── Edit Modal ─── */}
      {editOpen && (
        <Modal isOpen={editOpen} onClose={() => setEditOpen(false)}>
          <div className={styles.modalContent}>
            <h3 className='h4'>Edit Employee</h3>
            <p className={styles.modalSub}>
              Update this employee&apos;s information.
            </p>
            {renderForm(editForm, setEditForm)}
            <div className={styles.modalActions}>
              <button
                className='goodBtnii'
                onClick={handleEdit}
                disabled={isPending}
              >
                {isPending ? "Saving…" : "Save Changes"}
              </button>
              <button
                className='neutralBtn'
                onClick={() => setEditOpen(false)}
                disabled={isPending}
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
