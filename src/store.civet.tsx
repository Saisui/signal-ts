var modulo = ((a: number, b: number) => (a % b + b) % b) as ((a: number, b: number) => number) & ((a: bigint, b: bigint) => bigint);
interface Ref<T> {
    _value: any
    actions: ((newVal: T, oldVal: T) => (T | undefined))[]
    bind: (action: (newVal: T, oldVal: T) => (T | undefined)) => void
    get value(): T
    set value(newVal: T)
    get(): T
    set(newVal: ((oldVal: T) => T) | T): void
}

export function ref<T>(value: T): Ref<T> {
    return ({
        _value: value,
        actions: [] as ((newVal: T, oldVal: T) => (T | undefined))[],
        get value(): T {
            return this._value
        },

        set value(newVal) {
            let old = this._value
            this._value = newVal
            for (const action of this.actions) { action(newVal, old) }
        },

        bind(action: ((newVal: T, oldVal: T) => (T | undefined))): void {
            this.actions.push(action)
        },

        get(): any {
            return this._value
        },

        set(newVal: ((oldVal: T) => T) | T): void {
            let old = this._value
            if (newVal instanceof Function) {
                newVal = newVal(old)
            }
            this._value = newVal
            for (const action of this.actions) { action(newVal, old) }
        }})
}

type LiterialAction = (value: any, old: any, key: string) => void

export class StoreObject {
    object: Record<string, any>
    handlers: Record<string, LiterialAction[]> = {}

    constructor(object: Record<string, any>) {
        this.object = object
    }

    bind(key: string, action: LiterialAction) {
        this.handlers[key] ??= []
        return this.handlers[key].push(action)
    }
    
    get(key: string): any {
        return this.object[key]
    }
    
    set(key: string, value: any): void {
        let old = this.object[key]
        this.object[key] = value
        this.handlers[key] ??= []
        for (const action of this.handlers[key]) {
            action(value, old, key)
        }
    }

    keys(): string[] {
        return Object.keys(this.object)
    }

    values(): any[] {
        return Object.values(this.object)
    }
    
    has(key: string): boolean {
        return key in this.object
    }
}

type ArrayHandler = {
    push?(item: any, idx: number): void
    set?(idx: number, newVal: any, oldVal: any): void
    delete?(oldVal: any, idx: number): void
    rotate?(curIdx: number, preIdxIdx: number, item: any): void
}

export class StoreArray<T> {
    list: (T | undefined)[]
    binds: ArrayHandler[] = []

    constructor(list: T[]) {
        this.list = list
    }
    
    bind(handlers: ArrayHandler): void {
        this.binds.push(handlers)
    }

    set(index: number, value: T): void {
        let old = this.list[index]
        this.list[index] = value
        for (const bind of this.binds) {
            bind.set?.(index, value, old)
        }
    }

    get(index: number): (T | undefined) {
        return this.list[index]
    }
    
    push(value: any): void {
        this.list.push(value)
        let idx = this.list.length - 1
        for (const bind of this.binds) {
            bind.push?.(value, idx)
        }
    }

    del(index: number): (T | undefined) {
        let ret: (T | undefined);
        let deleted: (T | undefined) = this.list.splice(index, 1)[0]
        ret = deleted
        for (const bind of this.binds) {
            bind.delete?.(deleted, index)
        }
        return ret
    }
    
    reIndex(oldIdx: number, newIdx: number): (boolean | undefined) {
        let ret1: (boolean | undefined);
        if (oldIdx === newIdx
               || this.list.length <= oldIdx && oldIdx < 0
               || this.list.length <= newIdx && newIdx < 0) { return ret1 }
        ret1 = true

        let middle, head, tail
        let item = this.list[oldIdx]

        if (oldIdx < newIdx) {
            middle = this.list.slice(oldIdx+1, (newIdx+1) + 1 || 1/0)
            head = this.list.slice(0, oldIdx + 1 || 1/0)
            tail = this.list.slice(newIdx+1)
            this.list = head.concat(middle).concat([item]).concat(tail)
        }
        else {
            middle = this.list.slice(newIdx, oldIdx + 1 || 1/0)
            head = this.list.slice(0, newIdx + 1 || 1/0)
            tail = this.list.slice(oldIdx+1)
            this.list = head.concat([item]).concat(middle).concat(tail)
        }

        for (const bind of this.binds) {
            bind.rotate?.(newIdx, oldIdx, item)
        }

        let i = 0;for (const item of middle) {const idx = i++;
            let cur = oldIdx < newIdx ? oldIdx + idx : newIdx + idx + 1
            let pre = oldIdx < newIdx ? cur - 1 : cur + 1
            for (const bind of this.binds) {
                bind.rotate?.(cur, pre, item)
            }
        };return ret1
    }

    rotate(n: number): (T | undefined)[] {
        let ret2: (T | undefined)[];
        let len = this.list.length
        if (n < 0) {
            n = modulo(n, len)
        }
        ret2 = this.list = this.list.slice(-n).concat(this.list.slice(0, (len-n) + 1 || 1/0))
        let i2 = 0;for (const item of this.list) {const idx = i2++;
            let oldIdx = modulo((idx - n), len)
            for (const bind of this.binds) {
                bind.rotate?.(idx, oldIdx, item)
            }
        };return ret2
    }
    reverse() {
        let ret3;
        ret3 = this.list.reverse()
        let len = this.list.length
        let i3 = 0;for (const item of this.list) {const idx = i3++;
            let oldIdx = len - 1 - idx
            for (const bind of this.binds) {
                bind.rotate?.(idx, oldIdx, item)
            }
        };return ret3
    }
    swap(i0: number, i1: number) {
        if (this.list.length <= i0 && i0 < 0
               || this.list.length <= i1 && i1 < 0) { return };
        [this.list[i0], this.list[i1]] = [this.list[i1], this.list[i0]]
        const results=[];for (const bind of this.binds) {
            bind.rotate?.(i0, i1, this.list[i0])
            results.push(bind.rotate?.(i1, i0, this.list[i1]))
        };return results;
    }
}

export function createStore<T>(anything: T | T[] | Record<string, any>): Ref<T> | StoreArray<T> | StoreObject {
    if(anything instanceof Array) {
            return new StoreArray(anything)}
else if(anything instanceof Object) {
            return new StoreObject(anything)}
else  {
            return ref(anything)
        }
}
