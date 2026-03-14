import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { v4 as uuidv4 } from "uuid";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateQrToken(): string {
  return `HC-${uuidv4().replace(/-/g, "").toUpperCase().slice(0, 16)}`;
}

export function formatTime(date: string | null): string {
  if (!date) return "--:--";
  return new Date(date).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

export function formatDate(date: string | null): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

export function isWithinTime(until: string | null): boolean {
  if (!until) return true;
  return new Date() <= new Date(until);
}

export function getCheckinResultLabel(result: string): string {
  const labels: Record<string, string> = {
    valid_entry: "ENTRA FREE ✓",
    used_qr: "QR YA USADO",
    expired_qr: "QR VENCIDO",
    invalid_qr: "QR INVÁLIDO",
    gold_entry: "GOLD ENTRY ✦",
  };
  return labels[result] || result;
}

export function getCheckinColor(result: string): string {
  const colors: Record<string, string> = {
    valid_entry: "green",
    used_qr: "red",
    expired_qr: "yellow",
    invalid_qr: "red",
    gold_entry: "gold",
  };
  return colors[result] || "red";
}

export function getRankingEmoji(position: number): string {
  const medals: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
  return medals[position] || `#${position}`;
}
