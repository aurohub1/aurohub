"use client";
import { PublishQueueProvider } from "@/hooks/usePublishQueue";
import GerentePublicar from "@/app/(gerente)/gerente/publicar/page";

export default function ClientePublicarPage() {
  return (
    <PublishQueueProvider>
      <GerentePublicar />
    </PublishQueueProvider>
  );
}
