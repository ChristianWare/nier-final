"use client";

import { signOut } from "next-auth/react";


import Button from "@/components/shared/Button/Button";

export default function UserButton() {
  return (
    <>
      <Button
        btnType='gray'
        arrow
        onClick={() => signOut()}
        text='Sign Out'
      />
    </>
  );
}
