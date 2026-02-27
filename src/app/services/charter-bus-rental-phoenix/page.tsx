import CharterPageIntro from "@/components/charterPage/CharterPageIntro/CharterPageIntro";
import WhyCharter from "@/components/charterPage/WhyCharter/WhyCharter";
import Nav from "@/components/shared/Nav/Nav";
import React from "react";

export default function CharterBusRentalPage() {
  return (
    <main>
      <Nav background='white' />
      <CharterPageIntro />
      <WhyCharter />
    </main>
  );
}
