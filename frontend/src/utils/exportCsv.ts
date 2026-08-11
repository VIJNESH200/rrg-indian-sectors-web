import { RrgResponseData } from "../types";
import { getSectorName } from "../sectors";
import { getQuadrant } from "../components/RRGChartCanvas";

export function exportRrgDataToCSV(data: RrgResponseData) {
  if (!data || !data.dates || !data.sectors) return;

  const headers = [
    "Date",
    "Sector_Ticker",
    "Sector_Name",
    "RS_Ratio",
    "RS_Momentum",
    "Quadrant",
    "Forward_4W_Return_Pct"
  ];

  const rows: string[] = [headers.join(",")];

  data.dates.forEach((date, dateIdx) => {
    data.sectors.forEach((sec) => {
      const m = data.metrics[sec];
      if (!m) return;
      const ratio = m.rsRatio[dateIdx];
      const mom   = m.rsMomentum[dateIdx];
      const fwd   = m.forward4wReturn[dateIdx];
      const name  = getSectorName(sec);

      const quadrant = ratio != null && mom != null ? getQuadrant(ratio, mom) : "N/A";
      const ratioStr = ratio != null ? ratio.toFixed(4) : "";
      const momStr   = mom != null ? mom.toFixed(4) : "";
      const fwdStr   = fwd != null ? (fwd * 100).toFixed(2) : "";

      rows.push(`"${date}","${sec}","${name}",${ratioStr},${momStr},"${quadrant}","${fwdStr}"`);
    });
  });

  const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(rows.join("\n"));
  const link = document.createElement("a");
  const filename = `RRG_Indian_Sectors_Data_${new Date().toISOString().split("T")[0]}.csv`;

  link.setAttribute("href", csvContent);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
