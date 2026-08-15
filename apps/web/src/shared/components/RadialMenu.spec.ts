import { calculateRadialPositions, type RadialMenuItem } from './RadialMenu';

describe('RadialMenu calculation', () => {
  const noop = () => {
    /* no-op for tests */
  };

  it('correctly calculates polar coordinates for exact custom angles', () => {
    const items: RadialMenuItem[] = [
      { id: 'right', label: 'Right', icon: null, onClick: noop, angle: 0 },
      { id: 'down', label: 'Down', icon: null, onClick: noop, angle: 90 },
      { id: 'left', label: 'Left', icon: null, onClick: noop, angle: 180 },
      { id: 'up', label: 'Up', icon: null, onClick: noop, angle: 270 },
    ];

    const cx = 180;
    const cy = 180;
    const radius = 100;

    const positions = calculateRadialPositions(items, radius, cx, cy);

    expect(positions).toHaveLength(4);

    // 0° (Leste): x = 180 + 100 = 280, y = 180
    expect(positions[0].x).toBeCloseTo(280, 4);
    expect(positions[0].y).toBeCloseTo(180, 4);

    // 90° (Sul): x = 180, y = 180 + 100 = 280
    expect(positions[1].x).toBeCloseTo(180, 4);
    expect(positions[1].y).toBeCloseTo(280, 4);

    // 180° (Oeste): x = 180 - 100 = 80, y = 180
    expect(positions[2].x).toBeCloseTo(80, 4);
    expect(positions[2].y).toBeCloseTo(180, 4);

    // 270° (Norte): x = 180, y = 180 - 100 = 80
    expect(positions[3].x).toBeCloseTo(180, 4);
    expect(positions[3].y).toBeCloseTo(80, 4);
  });

  it('correctly distributes unpositioned items uniformly around 360 degrees', () => {
    const items: RadialMenuItem[] = [
      { id: '1', label: 'Item 1', icon: null, onClick: noop },
      { id: '2', label: 'Item 2', icon: null, onClick: noop },
      { id: '3', label: 'Item 3', icon: null, onClick: noop },
      { id: '4', label: 'Item 4', icon: null, onClick: noop },
    ];

    const cx = 180;
    const cy = 180;
    const radius = 100;

    const positions = calculateRadialPositions(items, radius, cx, cy, 0);

    expect(positions).toHaveLength(4);
    // Passo = 360 / 4 = 90°
    expect(positions[0].angleDeg).toBeCloseTo(0, 4);
    expect(positions[1].angleDeg).toBeCloseTo(90, 4);
    expect(positions[2].angleDeg).toBeCloseTo(180, 4);
    expect(positions[3].angleDeg).toBeCloseTo(270, 4);
  });
});
