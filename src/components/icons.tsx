import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { label?: string };

function svg(d: string) {
  return function Icon(props: IconProps) {
    const { label, ...rest } = props;
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        width={16}
        height={16}
        aria-hidden={label ? undefined : true}
        role={label ? "img" : undefined}
        aria-label={label}
        {...rest}
      >
        <path d={d} />
      </svg>
    );
  };
}

export const IconUpload = svg(
  "M12 4v12M7 9l5-5 5 5M5 20h14",
);
export const IconEye = svg(
  "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z",
);
export const IconEyeOff = svg(
  "M3 3l18 18M10.6 10.6a3 3 0 004.2 4.2M9.9 5.1A10 10 0 0112 5c6.5 0 10 7 10 7a13.2 13.2 0 01-3.1 4M6.1 6.1A13.2 13.2 0 002 12s3.5 7 10 7c1.7 0 3.2-.4 4.5-1",
);
export const IconLock = svg(
  "M6 11V8a6 6 0 1112 0v3M5 11h14v9H5z",
);
export const IconCheck = svg("M5 12l4 4 10-10");
export const IconAlert = svg(
  "M12 9v4M12 17h.01M10.3 3.86l-8.45 14a2 2 0 001.74 3h16.82a2 2 0 001.74-3l-8.45-14a2 2 0 00-3.4 0z",
);
export const IconInfo = svg(
  "M12 16v-4M12 8h.01M12 21a9 9 0 100-18 9 9 0 000 18z",
);
export const IconCopy = svg(
  "M9 9h10v10H9zM5 15H4a1 1 0 01-1-1V4a1 1 0 011-1h10a1 1 0 011 1v1",
);
export const IconExternal = svg(
  "M14 4h6v6M10 14L20 4M19 13v6a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1h6",
);
export const IconFolder = svg(
  "M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z",
);
export const IconFile = svg(
  "M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5zM14 3v5h5",
);
export const IconLogout = svg(
  "M16 17l5-5-5-5M21 12H9M12 21H5a2 2 0 01-2-2V5a2 2 0 012-2h7",
);
export const IconSearch = svg(
  "M21 21l-4.3-4.3M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z",
);
export const IconPlus = svg("M12 5v14M5 12h14");
export const IconList = svg("M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01");
export const IconLink = svg("M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1");
export const IconChevron = svg("M9 6l6 6-6 6");
