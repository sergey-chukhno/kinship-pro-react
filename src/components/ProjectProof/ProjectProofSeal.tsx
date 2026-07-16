import React from 'react';

interface ProjectProofSealProps {
  fill: string;
  stroke: string;
  innerStroke: string;
  textFill: string;
  size?: number;
}

const ProjectProofSeal: React.FC<ProjectProofSealProps> = ({
  fill,
  stroke,
  innerStroke,
  textFill,
  size = 52,
}) => (
  <svg width={size} height={size} viewBox="0 0 52 52" style={{ flexShrink: 0 }} aria-hidden="true">
    <polygon points="26,2 50,14 50,38 26,50 2,38 2,14" fill={fill} stroke={stroke} strokeWidth="2" />
    <polygon
      points="26,7 44,16 44,36 26,45 8,36 8,16"
      fill="none"
      stroke={innerStroke}
      strokeWidth="1"
    />
    <text x="26" y="31" textAnchor="middle" fontSize="15" fontWeight="700" fill={textFill}>
      K
    </text>
  </svg>
);

export default ProjectProofSeal;
