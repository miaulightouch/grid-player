<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div ref="root" class="relative h-full w-full bg-gray-900">
    <div
      class="relative h-full flex overflow-hidden bg-black"
      @pointermove="idleCheck"
      @pointerleave="idle = true"
      @dragover.prevent
      @drop.prevent="dropFile"
    >
      <div class="relative flex flex-1 flex-shrink items-center justify-center">
        <div class="aspect-video max-h-full max-w-full overflow-hidden">
          <video
            ref="video"
            class="pointer-events-none origin-left-top transform-gpu"
            :style="videoStyles"
          />
        </div>
        <div
          class="absolute bottom-0 left-0 h-12 w-full flex items-center from-gray-900/70 to-transparent bg-gradient-to-t p-2 text-white transition-opacity space-x-4"
          :class="{
            'opacity-0 pointer-events-none': idle,
            'opacity-100': !idle,
          }"
        >
          <span
            class="aspect-square h-full w-initial cursor-pointer"
            :class="{
              'i-ri-play-fill': !playing,
              'i-ri-pause-fill': playing,
            }"
            @click="playing = !playing"
          />
          <span
            class="aspect-square h-full w-initial"
            :class="{
              'i-ri-volume-up-fill': +volume > 0,
              'i-ri-volume-mute-fill': +volume === 0,
            }"
          />
          <input
            id="volume"
            v-model="volume"
            class="w-26"
            type="range"
            name="volume"
            min="0"
            max="1"
            step="any"
          />
          <div class="flex-1" />
          <span
            class="i-ri-vidicon-fill aspect-square h-full w-initial cursor-pointer"
            @click="sideMenuOpen = !sideMenuOpen"
          />
          <span
            class="aspect-square h-full w-initial cursor-pointer"
            :class="{
              'i-ri-fullscreen-fill': !isFullscreen,
              'i-ri-fullscreen-exit-fill': isFullscreen,
            }"
            @click="toggle"
          />
        </div>
      </div>
      <div
        class="h-full flex-shrink-0 from-gray-900/70 to-black bg-gradient-to-l transition-all duration-100"
        :class="{ 'w-15%': sideMenuOpen, 'w-0': !sideMenuOpen }"
      >
        <div
          ref="sideMenu"
          class="grid grid-rows-5 h-full w-15% w-full items-center justify-center p-2 text-white"
        >
          <div
            v-for="index in presets.length"
            :key="index"
            class="relative aspect-video cursor-pointer"
            :class="canvasClasses"
          >
            <canvas
              ref="cam"
              width="400"
              height="225"
              class="h-full w-full border-2 border-gray-700 rounded-2"
              :class="{ 'border-yellow': angle === index }"
              @click="angle = index"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
const root = ref<HTMLElement>();
const video = ref<HTMLVideoElement>();
const sideMenu = ref<HTMLElement>();
const cam = ref<HTMLCanvasElement[]>([]);

const sideMenuSize = useElementSize(sideMenu);
const { playing, volume } = useMediaControls(video);
const { isFullscreen, toggle } = useFullscreen(root);

interface VideoOptions {
  noCut?: boolean;
}

type Preset = [number, number, VideoOptions?];

const layout = [2, 2];
const presets: Preset[] = [
  [0, 0],
  [1, 0],
  [0, 1],
  [1, 1],
  [0, 0, { noCut: true }],
];

const videoStyles = computed(() => {
  if (!video.value) return '';
  const [x, y, options] = presets[angle.value - 1];
  const [scaleX, scaleY] = layout;

  if (options?.noCut) return '';

  return `
    --un-scale-x: ${scaleX};
    --un-scale-y: ${scaleY};
    --un-translate-x: ${x * -100}%;
    --un-translate-y: ${y * -100}%;`;
});

const idle = ref(true);
const angle = ref(5);
const savedVolume = useLocalStorage('volume', 0.5);
const sideMenuOpen = ref(false);

const idleTimeout = useTimeoutFn(
  () => {
    idle.value = true;
  },
  3000,
  { immediate: false }
);

const WIDESCREEN_RATIO = 16 / 9;
const canvasClasses = computed(() => {
  const ratio = sideMenuSize.width.value / (sideMenuSize.height.value / 5);
  return ratio >= WIDESCREEN_RATIO ? 'h-full w-initial' : 'w-full';
});

const idleCheck = useThrottleFn(() => {
  idle.value = false;
  idleTimeout.start();
});

const dropFile = (ev: DragEvent) => {
  ev.stopPropagation();
  if (video.value?.src) URL.revokeObjectURL(video.value.src);
  if (ev.dataTransfer?.items?.length) {
    [...ev.dataTransfer.items].some((item) => {
      if (item.kind !== 'file') return false;
      const file = item.getAsFile();
      if (file?.type.startsWith('video')) {
        video.value!.src = URL.createObjectURL(file);
        return true;
      }
    });
  } else if (ev.dataTransfer?.files?.length) {
    [...ev.dataTransfer.files].some((file) => {
      if (file.type.startsWith('video')) {
        video.value!.src = URL.createObjectURL(file);
        return true;
      }
    });
  }
};

/**
 * 繪製畫面
 * @param now 如果是-1，表示强制刷新
 */
const drawCameras = (now?: number) => {
  if (!playing.value) return;
  if (!sideMenuOpen.value && now !== -1) return;
  if (!video.value) return;
  if (!cam.value?.length) return;
  const { videoHeight, videoWidth } = video.value;
  const [scaleX, scaleY] = layout;
  const itemWidth = videoWidth / scaleX;
  const itemHeight = videoHeight / scaleY;
  cam.value.forEach((c, i) => {
    if (!video.value) return;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const [x, y, options] = presets[i];
    const w = options?.noCut ? videoWidth : itemWidth;
    const h = options?.noCut ? videoHeight : itemHeight;
    ctx.drawImage(video.value, x * itemWidth, y * itemHeight, w, h, 0, 0, c.width, c.height);
  });
};

watch(volume, (v) => {
  if (!video.value) return;
  savedVolume.value = v;
});

onMounted(() => {
  if (!video.value) return;
  volume.value = savedVolume.value;
  video.value.addEventListener('loadedmetadata', async () => {
    await video.value!.play();
    angle.value = 1;

    // 強制更新畫面
    drawCameras(-1);

    // 決定動畫更新方式
    const callbackFn = video.value?.requestVideoFrameCallback
      ? (cb: () => void) => video.value!.requestVideoFrameCallback(cb)
      : requestAnimationFrame;
    const cb = () => {
      drawCameras();
      callbackFn(cb);
    };
    cb();
  });
});
</script>

<style lang="scss" scoped>
.cam-label {
  @apply absolute left-1 top-0 font-700;
  text-shadow: #fff 1px 0 10px;
}
</style>

<style lang="scss">
#volume {
  @apply cursor-pointer appearance-none;
  &::-webkit-slider-runnable-track {
    @apply bg-current h-1;
  }
  &::-moz-range-track {
    @apply bg-current h-1;
  }
  &::-webkit-slider-thumb {
    @apply appearance-none bg-current w-3 h-3 -mt-1 rounded-full;
  }
}
</style>
