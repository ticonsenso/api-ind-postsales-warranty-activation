import { TtlCache } from './ttl-cache';

const ONE_HOUR_MS = 60 * 60 * 1000;

describe('TtlCache', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns a value it was given', () => {
    const cache = new TtlCache<string>(ONE_HOUR_MS);

    cache.set('serial-1', 'Heladera');

    expect(cache.get('serial-1')).toBe('Heladera');
    cache.onModuleDestroy();
  });

  it('returns undefined for a key it was never given', () => {
    const cache = new TtlCache<string>(ONE_HOUR_MS);

    expect(cache.get('missing')).toBeUndefined();
    cache.onModuleDestroy();
  });

  it('stops returning a value once its TTL elapses', () => {
    const cache = new TtlCache<string>(ONE_HOUR_MS);
    cache.set('serial-1', 'Heladera');

    jest.advanceTimersByTime(ONE_HOUR_MS + 1);

    expect(cache.get('serial-1')).toBeUndefined();
    cache.onModuleDestroy();
  });

  it('still returns the value right before the TTL elapses', () => {
    const cache = new TtlCache<string>(ONE_HOUR_MS);
    cache.set('serial-1', 'Heladera');

    jest.advanceTimersByTime(ONE_HOUR_MS - 1);

    expect(cache.get('serial-1')).toBe('Heladera');
    cache.onModuleDestroy();
  });

  it('uses the TTL given to set instead of the default one', () => {
    const cache = new TtlCache<string>(ONE_HOUR_MS);
    const shortTtlMs = ONE_HOUR_MS / 4;
    cache.set('serial-1', 'Heladera', shortTtlMs);

    jest.advanceTimersByTime(shortTtlMs - 1);
    expect(cache.get('serial-1')).toBe('Heladera');
    jest.advanceTimersByTime(1);
    expect(cache.get('serial-1')).toBeUndefined();
    cache.onModuleDestroy();
  });

  it('drops every entry when cleared', () => {
    const cache = new TtlCache<string>(ONE_HOUR_MS);
    cache.set('a', '1');
    cache.set('b', '2');

    cache.clear();

    expect(cache.get('a')).toBeUndefined();
    expect(cache.size).toBe(0);
    cache.onModuleDestroy();
  });

  it('refreshes the TTL when a key is set again', () => {
    const cache = new TtlCache<string>(ONE_HOUR_MS);
    cache.set('serial-1', 'Heladera');

    jest.advanceTimersByTime(ONE_HOUR_MS - 1);
    cache.set('serial-1', 'Heladera (actualizada)');
    jest.advanceTimersByTime(ONE_HOUR_MS - 1);

    expect(cache.get('serial-1')).toBe('Heladera (actualizada)');
    cache.onModuleDestroy();
  });

  it('sweeps expired entries on its own, without anyone reading them', () => {
    const cache = new TtlCache<string>(ONE_HOUR_MS, ONE_HOUR_MS);
    cache.set('serial-1', 'Heladera');

    expect(cache.size).toBe(1);
    jest.advanceTimersByTime(ONE_HOUR_MS + 1);

    expect(cache.size).toBe(0);
    cache.onModuleDestroy();
  });

  it('does not keep the process alive on its own (the sweep timer is unref-ed)', () => {
    const cache = new TtlCache<string>(ONE_HOUR_MS);

    expect(cache['sweepTimer'].hasRef()).toBe(false);
    cache.onModuleDestroy();
  });

  it('stops sweeping once destroyed', () => {
    const cache = new TtlCache<string>(ONE_HOUR_MS, ONE_HOUR_MS);
    cache.set('serial-1', 'Heladera');
    cache.onModuleDestroy();

    jest.advanceTimersByTime(ONE_HOUR_MS * 3);

    // No barrido activo, pero la lectura sigue respetando el TTL igual.
    expect(cache.get('serial-1')).toBeUndefined();
  });
});
