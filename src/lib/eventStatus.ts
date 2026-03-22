export function getEventStatus(startDate: string, endDate?: string | null) {
  const now = new Date();
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;

  // EVENTO FINALIZADO
  if (end && now > end) {
    return {
      label: "EVENTO FINALIZADO",
      color: "red",
      isLive: false,
      isFinished: true,
    };
  }

  // EN VIVO
  if (now >= start && (!end || now <= end)) {
    return {
      label: "EN VIVO",
      color: "green",
      isLive: true,
      isFinished: false,
    };
  }

  // FALTA PARA QUE ARRANQUE
  const diffMs = start.getTime() - now.getTime();
  const totalMinutes = Math.max(0, Math.floor(diffMs / 1000 / 60));

  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];

  if (days > 0) parts.push(`${days} ${days === 1 ? "DIA" : "DIAS"}`);
  if (hours > 0) parts.push(`${hours} HS`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes} MIN`);

  return {
    label: parts.join(" - "),
    color: "yellow",
    isLive: false,
    isFinished: false,
  };
}