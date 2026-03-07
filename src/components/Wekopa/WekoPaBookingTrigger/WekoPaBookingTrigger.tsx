"use client";

import Button from "@/components/shared/Button/Button";

interface Props {
  text: string;
  btnType?: "underlinedWhite" | "underlinedBlack" | "black" | "red";
}

export default function WekoPaBookingTrigger({
  text,
  btnType = "black",
}: Props) {
  const handleClick = () => {
    window.dispatchEvent(new Event("openWekopaBooking"));
  };

  return (
    <Button
      as='button'
      text={text}
      btnType={btnType}
      arrow
      onClick={handleClick}
    />
  );
}
