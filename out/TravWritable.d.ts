/// <reference types="node" />
/// <reference types="node" />
import internal, { Writable } from "stream";
interface TravWritableOptions<T> extends internal.WritableOptions {
    handler?: HandlerMethod<T>;
    enqueue?: ChunkEnqueueMethod<T>;
}
declare const kChunkQueue: unique symbol;
declare const kChunkCallback: unique symbol;
declare const kAppendMode: unique symbol;
declare type ChunkEnqueueMethod<T> = (this: TravWritable<T>, chunk: T | T[]) => void;
declare type HandlerMethod<T> = (this: TravWritable<T>, current: T) => void;
export default class TravWritable<T = string> extends Writable {
    protected enqueue(chunk: T | T[] | Buffer): void;
    protected handler(_chunk: T): Promise<void>;
    private [kChunkCallback];
    private [kChunkQueue];
    private [kAppendMode];
    finished: boolean;
    constructor(options?: TravWritableOptions<T>);
    private dequeue;
    protected push(data: T): void;
    next(count?: number): Promise<T | null>;
    peek(count?: number): Promise<T | null>;
    _write(chunk: any, _encoding: BufferEncoding, callback: (error?: Error | null | undefined) => void): Promise<void>;
    _final(callback: (error?: Error | null | undefined) => void): Promise<void>;
}
export {};
