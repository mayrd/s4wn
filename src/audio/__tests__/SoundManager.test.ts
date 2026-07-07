/**
 * Tests for SoundManager — Web Audio API sound system.
 */

import { SoundManager } from '../SoundManager';

// Mock Web Audio API
const mockAudioBuffer = {
  length: 44100,
  duration: 1,
  sampleRate: 44100,
  numberOfChannels: 1,
  getChannelData: () => new Float32Array(44100),
  copyFromChannel: () => {},
  copyToChannel: () => {},
};

const mockSource = {
  buffer: null as any,
  loop: false,
  connect: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
};

const mockGain = {
  gain: { value: 1 },
  connect: jest.fn(),
};

const mockContext = {
  state: 'running',
  sampleRate: 44100,
  destination: {},
  resume: jest.fn(),
  close: jest.fn(),
  createBuffer: jest.fn((_ch, length, _sr) => ({ ...mockAudioBuffer, length })),
  createBufferSource: jest.fn(() => mockSource),
  createGain: jest.fn(() => mockGain),
};

// @ts-ignore
global.AudioContext = jest.fn(() => mockContext);

// Mock fetch for load()
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

describe('SoundManager', () => {
  let sm: SoundManager;

  beforeEach(() => {
    sm = new SoundManager();
    jest.clearAllMocks();
  });

  afterEach(() => {
    sm.dispose();
  });

  it('should create a SoundManager instance', () => {
    expect(sm).toBeDefined();
    expect(sm.bufferCount).toBe(0);
    expect(sm.muted).toBe(false);
  });

  it('should generate a synthetic tone', () => {
    sm.generateTone('beep', 440, 0.5, 'sine');
    expect(sm.bufferCount).toBe(1);
    expect(sm.has('beep')).toBe(true);
  });

  it('should generate all four waveform types', () => {
    ('sine square triangle sawtooth'.split(' ') as OscillatorType[]).forEach((type, i) => {
      sm.generateTone(`wave${i}`, 440, 0.1, type);
      expect(sm.has(`wave${i}`)).toBe(true);
    });
    expect(sm.bufferCount).toBe(4);
  });

  it('should generate default game sounds', () => {
    sm.generateDefaults();
    expect(sm.has('click')).toBe(true);
    expect(sm.has('build')).toBe(true);
    expect(sm.has('destroy')).toBe(true);
    expect(sm.has('select')).toBe(true);
    expect(sm.has('error')).toBe(true);
    expect(sm.has('complete')).toBe(true);
    expect(sm.bufferCount).toBe(6);
  });

  it('should play a loaded buffer and return source node', () => {
    sm.generateTone('beep', 440, 0.1);
    const source = sm.play('beep');
    expect(source).toBeDefined();
    expect(mockSource.start).toHaveBeenCalled();
  });

  it('should return null when playing unknown buffer', () => {
    const source = sm.play('nonexistent');
    expect(source).toBeNull();
  });

  it('should toggle mute state', () => {
    sm.generateTone('beep', 440, 0.1);
    expect(sm.muted).toBe(false);
    sm.toggleMute();
    expect(sm.muted).toBe(true);
    sm.toggleMute();
    expect(sm.muted).toBe(false);
  });

  it('should clear buffers on dispose', () => {
    sm.generateTone('beep', 440, 0.1);
    expect(sm.bufferCount).toBe(1);
    sm.dispose();
    expect(sm.bufferCount).toBe(0);
    expect(mockContext.close).toHaveBeenCalled();
  });

  it('should handle setVolume within range', () => {
    sm.generateTone('beep', 440, 0.1);
    sm.play('beep');
    sm.setVolume(0.5);
    // gain should be set (we don't test internal state directly)
    expect(mockGain.gain.value).toBe(0.5);
  });

  it('should clamp volume to [0, 1]', () => {
    sm.generateTone('beep', 440, 0.1);
    sm.play('beep');
    sm.setVolume(-0.5);
    expect(mockGain.gain.value).toBe(0);
    sm.setVolume(1.5);
    expect(mockGain.gain.value).toBe(1);
  });
});
