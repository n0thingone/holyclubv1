"use client";

export default function HolyCoin({
  size = 32,
}: {
  size?: number;
}) {
  return (
    <div
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Glow */}
      <div className="absolute inset-0 rounded-full bg-fuchsia-500/70 blur-md animate-[pulse_1.8s_ease-in-out_infinite]" />

      {/* Coin */}
      <div
        className="relative z-10 flex items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white font-black leading-none"
        style={{
          width: size,
          height: size,
          fontSize: size * 0.42,
        }}
      >
        <span className="translate-y-[1px]">H</span>
      </div>
    </div>
  );
}