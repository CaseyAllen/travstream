"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
const stream_1 = require("stream");
const kChunkQueue = Symbol("Chunk Queue");
const kHandler = Symbol("Handler");
const kChunkCallback = Symbol("Chunk Callback");
const kAppendMode = Symbol("Append Mode");
class TravWritable extends stream_1.Writable {
    constructor(options) {
        if (options)
            options.autoDestroy = false;
        super(options);
        this[_a] = null;
        this[_b] = [];
        this[_c] = false;
        this.finished = false;
        if (options === null || options === void 0 ? void 0 : options.enqueue)
            this.enqueue = options.enqueue;
        if (options === null || options === void 0 ? void 0 : options.handler)
            this.handler = options.handler;
    }
    enqueue(chunk) {
        if (Buffer.isBuffer(chunk))
            chunk = chunk.toString().split("");
        if (!Array.isArray(chunk))
            chunk = [chunk];
        for (let item of chunk) {
            this.push(item);
        }
    }
    handler(_chunk) {
        return __awaiter(this, void 0, void 0, function* () {
            throw new Error("No Handler Provided");
        });
    }
    dequeue() {
        const returns = this[kChunkQueue].shift();
        if (returns)
            return returns;
        return this[kChunkQueue].shift() || null;
    }
    push(data) {
        this[kChunkQueue].push(data);
    }
    next(count = 1) {
        return new Promise((res) => {
            if (this[kChunkQueue].length >= count) {
                for (let i = 0; i < count - 1; i++)
                    this.dequeue();
                res(this.dequeue());
            }
            else {
                if (!this[kChunkCallback])
                    res(null);
                this[kAppendMode] = true;
                this.once("finish", () => {
                    this[kAppendMode] = false;
                    res(null);
                });
                this.once("write", () => {
                    res(this.next(count));
                });
                this[kChunkCallback]();
                this[kChunkCallback] = null;
            }
        });
    }
    peek(count = 1) {
        return new Promise((res) => __awaiter(this, void 0, void 0, function* () {
            const beforeState = [...this[kChunkQueue]];
            const peek = yield this.next(count);
            this[kChunkQueue] = beforeState;
            res(peek);
        }));
    }
    _write(chunk, _encoding, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            let hasCalledBack = false;
            const cb = () => {
                if (!hasCalledBack) {
                    hasCalledBack = true;
                    callback(null);
                }
            };
            this[kChunkCallback] = cb;
            this.enqueue(chunk);
            this.emit("write");
            if (!this[kAppendMode])
                yield this[kHandler]();
            cb();
        });
    }
    _final(callback) {
        return __awaiter(this, void 0, void 0, function* () {
            this.finished = true;
            callback();
        });
    }
    [(_a = kChunkCallback, _b = kChunkQueue, _c = kAppendMode, kHandler)]() {
        return __awaiter(this, void 0, void 0, function* () {
            let current = this.dequeue();
            while (current) {
                yield this.handler(current);
                current = yield this.next();
            }
            this.destroy();
        });
    }
}
exports.default = TravWritable;
