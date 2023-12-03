// uno.config.ts
import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetTypography,
  presetUno,
  presetWebFonts,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss';
import presetRemToPx from '@unocss/preset-rem-to-px';

export default defineConfig({
  shortcuts: [],
  theme: {},
  presets: [
    presetUno(),
    presetAttributify(),
    presetIcons(),
    presetTypography(),
    presetRemToPx(),
    presetWebFonts({
      fonts: {},
    }),
  ],
  transformers: [transformerDirectives(), transformerVariantGroup()],
});
