declare module "locomotive-scroll" {
  interface LocomotiveScrollOptions {
    el?: HTMLElement
    smooth?: boolean
    lerp?: number
    multiplier?: number
    class?: string
    [key: string]: unknown
  }

  export default class LocomotiveScroll {
    constructor(options?: LocomotiveScrollOptions)
    scroll: { instance: { scroll: { y: number } } }
    on(event: string, cb: (...args: unknown[]) => void): void
    update(): void
    destroy(): void
    scrollTo(target: number | string | HTMLElement, options?: object): void
  }
}
