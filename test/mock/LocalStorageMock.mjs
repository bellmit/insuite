export class LocalStorageMock {

    #store = {};

    get length() {
        return Object.keys( this.#store ).length;
    }

    clear() {
        this.#store = {};
    }

    getItem( key ) {
        return this.#store[key] || null;
    }

    setItem( key, value ) {
        this.#store[key] = value.toString();
    }

    removeItem( key ) {
        delete this.#store[key];
    }

    key( index ) {
        const keys = Object.keys( this.#store );

        return keys[index];
    }
}
