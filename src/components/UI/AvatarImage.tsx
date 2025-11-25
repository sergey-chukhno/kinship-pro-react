import React from 'react';

export const DEFAULT_AVATAR_SRC = '/default-avatar.jpg';

interface AvatarImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  fallbackSrc?: string;
}

const sanitizeSrc = (value?: string | null) => {
  if (!value) return '';
  const trimmed = value.trim();
  return trimmed;
};

const AvatarImage: React.FC<AvatarImageProps> = ({
  src,
  fallbackSrc = DEFAULT_AVATAR_SRC,
  alt = '',
  onError,
  ...rest
}) => {
  const safeSrc = sanitizeSrc(src) || fallbackSrc;

  const handleError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = event.currentTarget;
    if (target && target.src !== fallbackSrc) {
      target.src = fallbackSrc;
    }
    if (onError) {
      onError(event);
    }
  };

  return (
    <img
      src={safeSrc}
      alt={alt}
      onError={handleError}
      {...rest}
    />
  );
};

export default AvatarImage;

