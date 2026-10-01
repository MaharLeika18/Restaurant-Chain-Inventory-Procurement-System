export const getLabelSx = (theme: any) => ({
  '& .MuiInputBase-root': {
    marginTop: '15px',
  },
  '& .MuiInputLabel-root': {
    transform: 'translate(10px, 4px) scale(1)',
    px: '4px',
    zIndex: 1,
    background: `linear-gradient(
      to bottom,
      transparent calc(50% - 2px),
      ${(theme.vars || theme).palette.background.default} calc(50% - 2px),
      ${(theme.vars || theme).palette.background.default} calc(50% + 2px),
      transparent calc(50% + 2px)
    )`,
    '&.MuiInputLabel-shrink, &.Mui-focused, &.MuiInputLabel-shrink.Mui-focused': {
      transform: 'translate(10px, 4px) scale(1)',
    },
    '&.Mui-focused': {
      zIndex: 10,
    },
  },
});
