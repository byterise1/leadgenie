import Image from 'next/image';

type LogoProps = {
  size?: number;
  textSize?: string;
  textColor?: string;
  className?: string;
};

export function Logo({ size = 28, textSize = 'text-[15px]', textColor = 'text-gray-900', className = '' }: LogoProps) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <Image src="/logo.jpeg" alt="Lead Genie" width={size} height={size} className="rounded-lg shrink-0" priority />
      <span className={`font-extrabold ${textSize} ${textColor}`}>Lead Genie</span>
    </span>
  );
}
