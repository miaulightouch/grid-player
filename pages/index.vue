<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div ref="root" class="relative h-full w-full bg-gray-900">
    <div
      class="relative h-full flex overflow-hidden bg-black"
      @pointermove="idleCheck"
      @pointerleave="idle = true"
      @dragover.prevent
      @drop.prevent="dropFile"
      @click="playing = init && !playing"
    >
      <div class="relative flex flex-1 flex-shrink items-center justify-center">
        <div
          v-show="waiting"
          class="absolute left-1/2 top-1/2 z-1 transform-gpu text-white -translate-1/2"
        >
          <div class="i-ri-loader-5-fill h-40 w-40 animate-spin" />
        </div>

        <div
          v-show="!init"
          id="drop-area"
          class="absolute left-1/2 top-1/2 z-1 flex flex-col transform-gpu cursor-pointer items-center justify-center border-gray-700/60 rounded-2 bg-gray-100 p-4 -translate-1/2 space-y-4"
        >
          <input
            id="load-file"
            type="file"
            name="load-file"
            class="hidden"
            accept="video/*"
            @change="loadFile"
          />
          <h1 class="text-center text-2xl">Drop file here</h1>
          <div class="i-ri-file-upload-fill aspect-square h-20 w-20"></div>
        </div>

        <div class="mb-[1px] aspect-video max-h-full max-w-full overflow-hidden">
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
          @click.stop
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
          <div class="h-full flex flex-1 items-center justify-center">
            <span
              class="i-ri-vidicon-fill aspect-square h-full w-initial cursor-pointer"
              @click="(bottomMenuOpen = !bottomMenuOpen), (sideMenuOpen = false)"
            />
            <span
              class="aspect-square h-full w-initial cursor-pointer"
              :class="{
                'i-ri-arrow-down-double-fill': bottomMenuOpen,
                'i-ri-arrow-up-double-fill': !bottomMenuOpen,
              }"
              @click="(bottomMenuOpen = !bottomMenuOpen), (sideMenuOpen = false)"
            />
          </div>
          <span
            class="i-ri-vidicon-fill aspect-square h-full w-initial cursor-pointer"
            @click="(sideMenuOpen = !sideMenuOpen), (bottomMenuOpen = false)"
          />
          <span
            class="aspect-square h-full w-initial cursor-pointer"
            :class="{
              'i-ri-fullscreen-fill': !isFullscreen,
              'i-ri-fullscreen-exit-fill': isFullscreen,
            }"
            @click="toggle"
          />

          <input
            id="progress"
            v-model="progress"
            type="range"
            name="progress"
            step="any"
            class="absolute left-0 top-0 h-2 w-full transform-gpu cursor-pointer appearance-none bg-gray-300/60 bg-transparent from-yellow-400 to-gray-300/60 bg-gradient-to-r outline-none m-0! -translate-y-full"
            :style="{
              '--un-gradient-from-position': `${progress}%`,
              '--un-gradient-to-position': `${progress}%`,
            }"
          />
        </div>
      </div>

      <div
        class="flex-shrink-0"
        :class="{
          'h-full w-15% from-gray-900/70 to-black bg-gradient-to-l': sideMenuOpen,
          'w-0': !sideMenuOpen && !bottomMenuOpen,
          'absolute w-[50%] left-1/2 transform-gpu -translate-x-1/2 bg-gray-900/90 rounded-2':
            bottomMenuOpen,
          'bottom-0': bottomMenuOpen && idle,
          'bottom-14': bottomMenuOpen && !idle,
        }"
        @click.stop
      >
        <div
          ref="sideMenu"
          class="grid h-full w-full items-center justify-center p-2 text-white"
          :class="{
            'grid-rows-5': sideMenuOpen,
            'grid-cols-5 gap-2': bottomMenuOpen,
          }"
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
const { playing, volume, currentTime, duration, waiting } = useMediaControls(video);
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

const init = ref(false);
const idle = ref(true);
const angle = ref(5);
const savedVolume = useLocalStorage('volume', 0.5);
const sideMenuOpen = ref(false);
const bottomMenuOpen = ref(false);
const progressRaw = ref(0);
const progress = computed({
  get: () => (waiting.value ? progressRaw.value : (currentTime.value / duration.value) * 100 || 0),
  set: (v) => {
    if (!video.value) return;
    progressRaw.value = v;
    video.value.currentTime = (v / 100) * duration.value;
  },
});
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

const loadFile = (ev: Event) => {
  if (video.value?.src) URL.revokeObjectURL(video.value.src);
  const file = (ev.target as HTMLInputElement).files?.[0];
  if (file?.type.startsWith('video')) {
    video.value!.src = URL.createObjectURL(file);
    init.value = true;
  }
};

const dropFile = (ev: DragEvent) => {
  ev.stopPropagation();
  if (video.value?.src) URL.revokeObjectURL(video.value.src);
  if (ev.dataTransfer?.items?.length) {
    [...ev.dataTransfer.items].some((item) => {
      if (item.kind !== 'file') return false;
      const file = item.getAsFile();
      if (file?.type.startsWith('video')) {
        video.value!.src = URL.createObjectURL(file);
        init.value = true;
        return true;
      }
    });
  } else if (ev.dataTransfer?.files?.length) {
    [...ev.dataTransfer.files].some((file) => {
      if (file.type.startsWith('video')) {
        video.value!.src = URL.createObjectURL(file);
        init.value = true;
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
  if (!sideMenuOpen.value && !bottomMenuOpen.value && now !== -1) return;
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
  root.value!.querySelector('#drop-area')?.addEventListener('click', () => {
    root.value!.querySelector<HTMLInputElement>('#load-file')?.click();
  });
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

<style lang="scss">
#volume {
  @apply cursor-pointer appearance-none outline-none bg-transparent;
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
#progress {
  &::-webkit-slider-thumb {
    @apply appearance-none bg-yellow-400 w-3 h-3 rounded-full;
    &:hover,
    &:active {
      @apply w-4 h-4;
    }
  }
}
</style>
