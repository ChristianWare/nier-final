"use client";

import Button from "@/components/shared/Button/Button";

interface Props {
  sectionId: string;
  text: string;
}

export default function ScrollToSectionButton({ sectionId, text }: Props) {
  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    const el = document.getElementById(sectionId);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.pageYOffset - 100;
    window.scrollTo({ top: y, behavior: "smooth" });
  }

  return (
    <Button
      href={`#${sectionId}`}
      text={text}
      btnType='black'
      arrow
      onClick={handleClick as React.MouseEventHandler<HTMLButtonElement>}
    />
  );
}
