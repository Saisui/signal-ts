type RefHandler<T=any> = (nv: T, ov: T) => void
type RefOptions = {
    type?: string,
    range?: [number, number],
    w?: number,
    min?: number,
    max?: number,
    fix?: number,
    match?: RegExp,
}

class Ref<T=any> {
    opt: RefOptions
    _isRef: true
    _value: T
    actions: RefHandler[]
    constructor(val: any, opt: RefOptions = {}) {
        this.actions = []
        this._value = val
        this.opt = opt
        this._isRef = true
    }
    bind(f: RefHandler) { this.actions.push(f) }
    get value() { return this._value }
    set value(nv) {
        this.actions.forEach(f => f(nv, this._value))
        this._value = nv
    }
    get() {
        return this._value
    }
    set(nv: T) {
        this.value = nv
    }
    laset(fv: (ov:T) => T) {
        this.value = fv(this._value)
    }
}

function createRef<T=any>(val: T, opt = {}): Ref<T> {
    return new Ref<T>(val, opt)
}

class Store {
    store: Record<string, Ref>
    constructor(store: Record<string, Ref> = {}) {
        this.store = store
    }
    bind(key: string, handler: RefHandler) {
        this.store[key].bind(handler)
    }
    at(key: string) { return this.store[key] }
    getAt(key: string) {
        return this.store[key]
    }
    setAt(key: string, nv: any) {
        if(key in this.store) {
            this.store[key].value = nv
        } else {
            this.store[key] = nv._isRef ? nv : ref(nv)
        }
    }
}
type PushHandler<T=any> = (newRef: Ref<T>, ni: number) => void
type RotateHandler = (roNum: number) => void
type SwapHandler = (ai: number, bi: number) => void
type DeleteHandler = (i: number) => void

type ListHandler<T=any> = 
    PushHandler<T>
    | RotateHandler
    | SwapHandler
    | DeleteHandler
class List<T=any> {
    list: Ref<T>[]
    handlers: {
        push: PushHandler<T>[],
        rotate: RotateHandler[],
        swap: SwapHandler[],
        delete: DeleteHandler[],
    }
    constructor(list: any[] = []) {
        this.list = list
        this.handlers = {
            push: [],
            rotate: [],
            swap: [],
            delete: [],
        }
    }
    get length() { return this.list.length }
    bind<K extends keyof typeof this.handlers, F extends (typeof this.handlers)[K][number]>(name: K, func: F): void {
        this.handlers[name].push(func as any)
    }
    at(i: number) {
        return this.list[i]
    }
    setAt(i: number, nv: any) {
        if(!this.list[i]) {
            this.list[i] = nv._isRef ? nv : ref(nv)
        } else {
            this.list[i].set(nv)
        }
    }
    bindPush(action: PushHandler<T>): void {
        this.handlers['push'].push(action)
    }
    push(val: T): Ref<T> {
        const nRef = ref(val)
        const ni = this.list.length - 1
        this.list.push(ref(val))
        this.handlers['push'].forEach(f => f(nRef, ni))
        return nRef
    }
    rotate(n: number): void {
        this.list = [...this.list.slice(n), ...this.list.slice(0, n)]
    }
    swap(ai: number, bi: number): void {
        [this.list[ai], this.list[bi]] = [this.list[bi], this.list[ai]]
        this.handlers.swap.forEach(f => f(ai, bi))
    }
    deleteAt(i: number): void {
        delete this.list[i]
        this.handlers.delete.forEach(f => f(i))
    }
}

function ref(val: any, opt: RefOptions = {}): Ref<Store|List|any> {
    if(val.constructor == Array) {
        return createRef(val, opt)
    } else if(val.constructor == Object) {
        return createRef(new Store(val))
    } else {
        return createRef(new List(val))
    }
}
