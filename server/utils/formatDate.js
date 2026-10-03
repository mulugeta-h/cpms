
function formatDate(date) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";

  // Date parts
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();

  // Time parts
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const seconds = d.getSeconds().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";

  hours = hours % 12;
  hours = hours ? hours : 12; // The hour '0' should be '12'
  const strHours = hours.toString().padStart(2, "0");

  return `${day}/${month}/${year} ${strHours}:${minutes}:${seconds} ${ampm}`;
}

function getDuration(from, to) {
  const start = new Date(from);
  const end = new Date(to);

  if (isNaN(start) || isNaN(end) || end < start) return "—";

  const diffMs = end - start; // milliseconds
  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  let parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  return parts.length ? parts.join(" ") : "0m";
}

function getDurationInmins(from,to){
  const diffMs = new Date(to) - new Date(from);
  const Duration = Math.floor(diffMs / 60000); // ✅ minutes
  return Duration;
}

// 🔹 Add two durations (in "Xd Yh Zm" format)
function parseDuration(durationStr) {
  let days = 0, hours = 0, minutes = 0;
  if (!durationStr) return 0;

  const dayMatch = durationStr.match(/(\d+)d/);
  const hourMatch = durationStr.match(/(\d+)h/);
  const minMatch = durationStr.match(/(\d+)m/);

  if (dayMatch) days = parseInt(dayMatch[1], 10);
  if (hourMatch) hours = parseInt(hourMatch[1], 10);
  if (minMatch) minutes = parseInt(minMatch[1], 10);

  return days * 24 * 60 + hours * 60 + minutes; // total minutes
}

function formatDuration(totalMinutes) {
  const days = Math.floor(totalMinutes / (24 * 60));
  totalMinutes %= 24 * 60;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  let result = "";
  if (days > 0) result += `${days}d `;
  if (hours > 0) result += `${hours}h `;
  if (minutes > 0) result += `${minutes}m`;

  return result.trim() || "0m";
}

function addDurations(dur1, dur2) {
  const totalMinutes = parseDuration(dur1) + parseDuration(dur2);
  return formatDuration(totalMinutes);
}

module.exports = {
  formatDate,
  getDuration,
  getDurationInmins,
  addDurations,
};