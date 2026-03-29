import { Box } from "@mui/material";

const ChartErrorState = () => {
  return (
    <Box
      sx={{
        width: "100%",
        minHeight: 260,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Box sx={{ width: "100%", maxWidth: 680 }}>
        <svg width="100%" viewBox="0 0 680 280" xmlns="http://www.w3.org/2000/svg">

          {/* soft red card background */}
          <rect x="220" y="50" width="240" height="140" rx="12" fill="#FEF2F2" stroke="#FECACA" stroke-width="1"/>

          {/* baseline */}
          <line x1="240" y1="190" x2="440" y2="190" stroke="#FECACA" stroke-width="1.5" stroke-linecap="round"/>

          {/* bar 1 — short, faded, tilted left */}
          <g opacity="0.45" transform="rotate(-5 265 190)">
            <rect x="251" y="158" width="26" height="32" rx="3" fill="#FCA5A5"/>
            <line x1="257" y1="165" x2="269" y2="182" stroke="#F87171" stroke-width="1.5" stroke-linecap="round"/>
          </g>

          {/* bar 2 — medium, tilted right */}
          <g transform="rotate(4 303 190)">
            <rect x="290" y="128" width="26" height="62" rx="3" fill="#F87171"/>
            <line x1="296" y1="142" x2="308" y2="168" stroke="#FCA5A5" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="306" y1="138" x2="295" y2="160" stroke="#FECACA" stroke-width="1" stroke-linecap="round"/>
            <line x1="297" y1="172" x2="309" y2="184" stroke="#FCA5A5" stroke-width="1.2" stroke-linecap="round"/>
          </g>

          {/* bar 3 — tallest, most cracked, tilted left */}
          <g transform="rotate(-6 341 190)">
            <rect x="328" y="98" width="26" height="92" rx="3" fill="#EF4444"/>
            <line x1="334" y1="115" x2="346" y2="148" stroke="#FCA5A5" stroke-width="2" stroke-linecap="round"/>
            <line x1="344" y1="110" x2="332" y2="138" stroke="#FECACA" stroke-width="1.2" stroke-linecap="round"/>
            <line x1="335" y1="155" x2="347" y2="178" stroke="#FCA5A5" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="345" y1="150" x2="333" y2="172" stroke="#FECACA" stroke-width="1" stroke-linecap="round"/>
          </g>

          {/* bar 4 — medium, faded, tilted right */}
          <g opacity="0.55" transform="rotate(5 379 190)">
            <rect x="366" y="138" width="26" height="52" rx="3" fill="#F87171"/>
            <line x1="372" y1="152" x2="384" y2="174" stroke="#FCA5A5" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="382" y1="148" x2="371" y2="168" stroke="#FECACA" stroke-width="1" stroke-linecap="round"/>
          </g>

          {/* bar 5 — shortest, most faded, dropped, tilted left */}
          <g opacity="0.35" transform="rotate(-7 417 190) translate(0 10)">
            <rect x="404" y="162" width="26" height="28" rx="3" fill="#FCA5A5"/>
            <line x1="410" y1="170" x2="422" y2="184" stroke="#F87171" stroke-width="1.2" stroke-linecap="round"/>
          </g>

          {/* text */}
          <text x="340" y="218" text-anchor="middle" font-size="14" font-weight="600" fill="#374151" font-family="Inter, system-ui, sans-serif">Preview unavailable</text>


        </svg>
      </Box>
    </Box>
  );
};

export default ChartErrorState;
