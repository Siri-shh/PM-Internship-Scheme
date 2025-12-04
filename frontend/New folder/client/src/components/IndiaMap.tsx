import { motion } from "framer-motion";

interface MapDot {
  x: number;
  y: number;
  city: string;
  internships: number;
}

export function IndiaMap() {
  // todo: remove mock functionality - replace with real location data
  const locations: MapDot[] = [
    { x: 28, y: 22, city: "Delhi", internships: 8500 },
    { x: 22, y: 55, city: "Mumbai", internships: 12000 },
    { x: 32, y: 70, city: "Bangalore", internships: 15000 },
    { x: 40, y: 65, city: "Chennai", internships: 6500 },
    { x: 45, y: 50, city: "Hyderabad", internships: 9000 },
    { x: 50, y: 35, city: "Kolkata", internships: 5500 },
    { x: 35, y: 30, city: "Jaipur", internships: 3200 },
    { x: 24, y: 40, city: "Ahmedabad", internships: 4800 },
    { x: 38, y: 80, city: "Kochi", internships: 2800 },
    { x: 55, y: 28, city: "Guwahati", internships: 1500 },
    { x: 30, y: 45, city: "Pune", internships: 7500 },
    { x: 18, y: 35, city: "Surat", internships: 2200 },
  ];

  return (
    <div className="relative w-full max-w-2xl mx-auto aspect-[4/5]">
      <svg
        viewBox="0 0 100 120"
        className="w-full h-full"
        style={{ filter: "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))" }}
      >
        <defs>
          <linearGradient id="mapGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
            <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.3" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path
          d="M30 5 L45 3 L55 8 L60 15 L58 25 L65 30 L60 40 L55 50 L58 60 L50 75 L45 85 L40 95 L35 100 L30 95 L25 85 L20 75 L15 60 L18 45 L15 35 L20 25 L25 15 Z"
          fill="url(#mapGradient)"
          stroke="hsl(var(--primary))"
          strokeWidth="0.5"
          className="opacity-80"
        />

        {locations.map((loc, index) => (
          <g key={loc.city}>
            <motion.circle
              cx={loc.x}
              cy={loc.y}
              r="3"
              fill="hsl(var(--primary))"
              filter="url(#glow)"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: [1, 1.3, 1], 
                opacity: [0.8, 1, 0.8] 
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: index * 0.2,
              }}
            />
            <motion.circle
              cx={loc.x}
              cy={loc.y}
              r="6"
              fill="hsl(var(--primary))"
              opacity="0.2"
              initial={{ scale: 0 }}
              animate={{ scale: [0.5, 1.5, 0.5] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: index * 0.2,
              }}
            />
          </g>
        ))}
      </svg>

      <div className="absolute bottom-4 left-4 right-4 flex flex-wrap justify-center gap-2">
        {locations.slice(0, 5).map((loc) => (
          <motion.div
            key={loc.city}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-3 py-1.5 bg-card rounded-full text-xs font-medium shadow-sm border"
          >
            <span className="text-foreground">{loc.city}</span>
            <span className="text-muted-foreground ml-1">({loc.internships.toLocaleString()})</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
