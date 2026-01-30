import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrthographicCamera } from '@react-three/drei'
import { Physics, useBox, useCylinder, usePlane } from '@react-three/cannon'
import * as THREE from 'three'

type BlockType = 'box' | 'cylinder' | 'prism'

type GameMode = 'time-attack' | 'event'

type BoxData = {
  id: number
  type: BlockType
  position: [number, number, number]
  size: [number, number, number]
  color: string
}

const FLOOR_SIZE = 80
const DROP_HEIGHT = 6
const GRID_SIZE = 0.5
const TIME_ATTACK_DURATION = 60
const EVENT_DURATION = 45
const PALETTE = ['#f4a261', '#2a9d8f', '#e76f51', '#6c8ec6', '#ef476f', '#ffd166']

function CameraRig() {
  const { camera } = useThree()

  useEffect(() => {
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
  }, [camera])

  return null
}

function Floor({
  onDrop,
  onHover,
  onLeave,
}: {
  onDrop: (point: THREE.Vector3) => void
  onHover: (point: THREE.Vector3) => void
  onLeave: () => void
}) {
  const grassTexture = useMemo(() => {
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.fillStyle = '#a7c89a'
    ctx.fillRect(0, 0, size, size)

    for (let i = 0; i < 5000; i += 1) {
      const x = Math.random() * size
      const y = Math.random() * size
      const shade = 150 + Math.random() * 40
      ctx.fillStyle = `rgb(${110}, ${shade}, ${110})`
      ctx.fillRect(x, y, 1, 2)
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(8, 8)
    texture.anisotropy = 8
    texture.needsUpdate = true
    return texture
  }, [])

  const [ref] = usePlane(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, 0, 0],
  }))

  return (
    <mesh
      ref={ref}
      onPointerMove={(event) => {
        event.stopPropagation()
        onHover(event.point)
      }}
      onPointerOut={() => onLeave()}
      onPointerDown={(event) => {
        event.stopPropagation()
        onDrop(event.point)
      }}
    >
      <planeGeometry args={[FLOOR_SIZE, FLOOR_SIZE]} />
      <meshStandardMaterial color="#a7c89a" map={grassTexture ?? undefined} />
    </mesh>
  )
}

function Box({
  id,
  position,
  size,
  color,
  onRegister,
  onHeight,
  onRemove,
}: BoxData & {
  onRegister: (id: number, api: unknown | null) => void
  onHeight: (id: number, height: number) => void
  onRemove: (id: number) => void
}) {
  const [ref, api] = useBox(() => ({
    mass: 1,
    position,
    args: size,
  }))

  useEffect(() => {
    onRegister(id, api)
    return () => onRegister(id, null)
  }, [api, id, onRegister])

  useEffect(
    () =>
      api.position.subscribe(([, y]) => {
        onHeight(id, y + size[1] / 2)
      }),
    [api.position, id, onHeight, size]
  )

  return (
    <mesh
      ref={ref}
      onPointerDown={(event) => {
        if (event.button !== 2) return
        event.stopPropagation()
        onRemove(id)
      }}
      onContextMenu={(event) => event.nativeEvent.preventDefault()}
    >
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

function Cylinder({
  id,
  position,
  size,
  color,
  onRegister,
  onHeight,
  onRemove,
}: BoxData & {
  onRegister: (id: number, api: unknown | null) => void
  onHeight: (id: number, height: number) => void
  onRemove: (id: number) => void
}) {
  const radius = size[0] / 2
  const height = size[1]
  const [ref, api] = useCylinder(() => ({
    mass: 1,
    position,
    args: [radius, radius, height, 24],
  }))

  useEffect(() => {
    onRegister(id, api)
    return () => onRegister(id, null)
  }, [api, id, onRegister])

  useEffect(
    () =>
      api.position.subscribe(([, y]) => {
        onHeight(id, y + size[1] / 2)
      }),
    [api.position, id, onHeight, size]
  )

  return (
    <mesh
      ref={ref}
      onPointerDown={(event) => {
        if (event.button !== 2) return
        event.stopPropagation()
        onRemove(id)
      }}
      onContextMenu={(event) => event.nativeEvent.preventDefault()}
    >
      <cylinderGeometry args={[radius, radius, height, 24]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

function Prism({
  id,
  position,
  size,
  color,
  onRegister,
  onHeight,
  onRemove,
}: BoxData & {
  onRegister: (id: number, api: unknown | null) => void
  onHeight: (id: number, height: number) => void
  onRemove: (id: number) => void
}) {
  const side = size[0]
  const height = size[1]
  const radius = side / Math.sqrt(3)
  const [ref, api] = useCylinder(() => ({
    mass: 1,
    position,
    args: [radius, radius, height, 3],
  }))

  useEffect(() => {
    onRegister(id, api)
    return () => onRegister(id, null)
  }, [api, id, onRegister])

  useEffect(
    () =>
      api.position.subscribe(([, y]) => {
        onHeight(id, y + size[1] / 2)
      }),
    [api.position, id, onHeight, size]
  )

  return (
    <mesh
      ref={ref}
      onPointerDown={(event) => {
        if (event.button !== 2) return
        event.stopPropagation()
        onRemove(id)
      }}
      onContextMenu={(event) => event.nativeEvent.preventDefault()}
    >
      <cylinderGeometry args={[radius, radius, height, 3]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

function Preview({
  point,
  size,
  thickness,
  type,
}: {
  point: THREE.Vector3 | null
  size: number
  thickness: number
  type: BlockType
}) {
  if (!point) return null

  const y = 0.02
  const radius = size / 2
  const prismRadius = size / Math.sqrt(3)

  return (
    <group position={[point.x, y, point.z]}>
      {type === 'box' && (
        <mesh>
          <boxGeometry args={[size, thickness, size]} />
          <meshStandardMaterial color="#1f2933" wireframe transparent opacity={0.35} />
        </mesh>
      )}
      {type === 'cylinder' && (
        <mesh>
          <cylinderGeometry args={[radius, radius, thickness, 24]} />
          <meshStandardMaterial color="#1f2933" wireframe transparent opacity={0.35} />
        </mesh>
      )}
      {type === 'prism' && (
        <mesh>
          <cylinderGeometry args={[prismRadius, prismRadius, thickness, 3]} />
          <meshStandardMaterial color="#1f2933" wireframe transparent opacity={0.35} />
        </mesh>
      )}
    </group>
  )
}

export default function App() {
  const [boxes, setBoxes] = useState<BoxData[]>([])
  const nextId = useRef(1)
  const [size, setSize] = useState(1.4)
  const [thickness, setThickness] = useState(0.9)
  const [blockType, setBlockType] = useState<BlockType>('box')
  const [hoverPoint, setHoverPoint] = useState<THREE.Vector3 | null>(null)
  const [zoom, setZoom] = useState(() => {
    const saved = localStorage.getItem('cameraZoom')
    return saved ? Number(saved) : 45
  })
  const [cameraDistance, setCameraDistance] = useState(() => {
    const saved = localStorage.getItem('cameraDistance')
    return saved ? Number(saved) : 14
  })
  const [mode, setMode] = useState<GameMode>('time-attack')
  const [roundActive, setRoundActive] = useState(false)
  const [timeLeft, setTimeLeft] = useState(TIME_ATTACK_DURATION)
  const [maxHeight, setMaxHeight] = useState(0)
  const [bestHeight, setBestHeight] = useState(0)
  const [windStrength, setWindStrength] = useState(6)
  const [windIntervalMs, setWindIntervalMs] = useState(900)
  const maxHeightRef = useRef(0)
  const bodyApis = useRef(new Map<number, unknown>())
  const [nickname, setNickname] = useState(() => {
    const saved = localStorage.getItem('nickname')
    return saved && saved.trim() ? saved : ''
  })
  const [nicknameInput, setNicknameInput] = useState(nickname)
  const [nicknameReady, setNicknameReady] = useState(Boolean(nickname))
  const [playerColor, setPlayerColor] = useState(() => {
    const saved = localStorage.getItem('playerColor')
    return saved && saved.trim() ? saved : PALETTE[0]
  })

  const snapToGrid = (point: THREE.Vector3) =>
    new THREE.Vector3(
      Math.round(point.x / GRID_SIZE) * GRID_SIZE,
      point.y,
      Math.round(point.z / GRID_SIZE) * GRID_SIZE
    )

  const handleDrop = (point: THREE.Vector3) => {
    const boxSize: [number, number, number] = [size, thickness, size]
    const newBox: BoxData = {
      id: nextId.current++,
      type: blockType,
      position: [point.x, DROP_HEIGHT, point.z],
      size: boxSize,
      color: playerColor,
    }

    setBoxes((prev) => [...prev, newBox])
  }

  const handleRemove = (id: number) => {
    setBoxes((prev) => prev.filter((box) => box.id !== id))
    bodyApis.current.delete(id)
  }

  const registerBody = (id: number, api: unknown | null) => {
    if (api) {
      bodyApis.current.set(id, api)
    } else {
      bodyApis.current.delete(id)
    }
  }


  const handleHeight = (_id: number, height: number) => {

    if (height <= maxHeightRef.current) return
    maxHeightRef.current = height
    setMaxHeight(height)
    if (roundActive && height > bestHeight) {
      setBestHeight(height)
    }
  }

  const resetRound = () => {
    maxHeightRef.current = 0
    setMaxHeight(0)
    setTimeLeft(mode === 'time-attack' ? TIME_ATTACK_DURATION : EVENT_DURATION)
  }

  const startRound = () => {
    resetRound()
    setRoundActive(true)
  }

  const endRound = () => {
    setRoundActive(false)
    setBestHeight((prev) => Math.max(prev, maxHeightRef.current))
  }

  const clearBlocks = () => {
    setBoxes([])
    bodyApis.current.clear()
    maxHeightRef.current = 0
    setMaxHeight(0)
  }

  useEffect(() => {
    if (!roundActive) return
    const tick = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          endRound()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(tick)
  }, [roundActive])

  useEffect(() => {
    if (!roundActive || mode !== 'event') return
    const windInterval = setInterval(() => {
      if (bodyApis.current.size === 0) return
      const strength = windStrength
      const direction = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5)
        .normalize()
      bodyApis.current.forEach((api) => {
        const bodyApi = api as {
          applyForce: (force: [number, number, number], worldPoint: [number, number, number]) => void
        }
        bodyApi.applyForce([direction.x * strength, 0, direction.z * strength], [0, 0, 0])
      })
    }, windIntervalMs)
    return () => clearInterval(windInterval)
  }, [mode, roundActive, windIntervalMs, windStrength])

  return (
    <div className="app">
      <Canvas dpr={[1, 2]} style={{ width: '100%', height: '100%', display: 'block' }}>
        <color attach="background" args={['#f3f5f7']} />
        <OrthographicCamera
          makeDefault
          position={[cameraDistance, cameraDistance, cameraDistance]}
          zoom={zoom}
        />
        <CameraRig />
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 15, 5]} intensity={0.9} />
        <Physics gravity={[0, -9.81, 0]}>
          <Floor
            onDrop={handleDrop}
            onHover={(point) => setHoverPoint(snapToGrid(point))}
            onLeave={() => setHoverPoint(null)}
          />
          {boxes.map((box) => {
            if (box.type === 'cylinder') {
              return (
                <Cylinder
                  key={box.id}
                  {...box}
                  onRegister={registerBody}
                  onHeight={handleHeight}
                  onRemove={handleRemove}
                />
              )
            }
            if (box.type === 'prism') {
              return (
                <Prism
                  key={box.id}
                  {...box}
                  onRegister={registerBody}
                  onHeight={handleHeight}
                  onRemove={handleRemove}
                />
              )
            }
            return (
              <Box
                key={box.id}
                {...box}
                onRegister={registerBody}
                onHeight={handleHeight}
                onRemove={handleRemove}
              />
            )
          })}
          <Preview point={hoverPoint} size={size} thickness={thickness} type={blockType} />
        </Physics>
      </Canvas>
      <div className="hud">
        <div>닉네임: {nickname || 'guest'}</div>
        <div>모드: {mode === 'time-attack' ? '타임어택' : '이벤트 라운드'}</div>
        <div>남은 시간: {timeLeft}s</div>
        <div>최고 높이: {maxHeight.toFixed(2)}</div>
        <div>베스트: {bestHeight.toFixed(2)}</div>
        {!roundActive ? (
          <button type="button" onClick={startRound}>
            라운드 시작
          </button>
        ) : (
          <button type="button" onClick={endRound}>
            라운드 종료
          </button>
        )}
        <button type="button" onClick={clearBlocks}>
          블록 초기화
        </button>
      </div>
      <div className="panel">
        <div className="panel-title">블록 설정</div>
        <div className="panel-section">
          <div className="panel-label">내 색상</div>
          <div className="color-palette">
            {PALETTE.map((color) => (
              <button
                key={color}
                type="button"
                className={playerColor === color ? 'active' : ''}
                style={{ backgroundColor: color }}
                onClick={() => {
                  localStorage.setItem('playerColor', color)
                  setPlayerColor(color)
                }}
                aria-label={`색상 ${color}`}
              />
            ))}
          </div>
        </div>
        <div className="panel-tabs panel-tabs-mode">
          <button
            type="button"
            className={mode === 'time-attack' ? 'active' : ''}
            onClick={() => {
              setMode('time-attack')
              resetRound()
            }}
          >
            타임어택
          </button>
          <button
            type="button"
            className={mode === 'event' ? 'active' : ''}
            onClick={() => {
              setMode('event')
              resetRound()
            }}
          >
            이벤트
          </button>
        </div>
        {mode === 'event' && (
          <div className="panel-section">
            <div className="panel-label">이벤트 설명</div>
            <div className="panel-help">
              일정 주기로 바람이 불어 블록이 밀립니다. 버티면서 쌓아보세요.
            </div>
            <label className="panel-row">
              <span>바람 세기</span>
              <input
                type="range"
                min={2}
                max={14}
                step={1}
                value={windStrength}
                onChange={(event) => setWindStrength(Number(event.target.value))}
              />
              <span className="panel-value">{windStrength}</span>
            </label>
            <label className="panel-row">
              <span>주기</span>
              <input
                type="range"
                min={300}
                max={1500}
                step={100}
                value={windIntervalMs}
                onChange={(event) => setWindIntervalMs(Number(event.target.value))}
              />
              <span className="panel-value">{(windIntervalMs / 1000).toFixed(1)}s</span>
            </label>
          </div>
        )}
        <div className="panel-tabs">
          <button
            type="button"
            className={blockType === 'box' ? 'active' : ''}
            onClick={() => setBlockType('box')}
          >
            사각
          </button>
          <button
            type="button"
            className={blockType === 'cylinder' ? 'active' : ''}
            onClick={() => setBlockType('cylinder')}
          >
            원형
          </button>
          <button
            type="button"
            className={blockType === 'prism' ? 'active' : ''}
            onClick={() => setBlockType('prism')}
          >
            삼각
          </button>
        </div>
        <label className="panel-row">
          <span>크기</span>
          <input
            type="range"
            min={0.6}
            max={3}
            step={0.1}
            value={size}
            onChange={(event) => setSize(Number(event.target.value))}
          />
          <span className="panel-value">{size.toFixed(1)}</span>
        </label>
        <label className="panel-row">
          <span>두께</span>
          <input
            type="range"
            min={0.3}
            max={2}
            step={0.1}
            value={thickness}
            onChange={(event) => setThickness(Number(event.target.value))}
          />
          <span className="panel-value">{thickness.toFixed(1)}</span>
        </label>
        <label className="panel-row">
          <span>시야</span>
          <input
            type="range"
            min={25}
            max={90}
            step={1}
            value={zoom}
            onChange={(event) => {
              const value = Number(event.target.value)
              setZoom(value)
              localStorage.setItem('cameraZoom', String(value))
            }}
          />
          <span className="panel-value">{zoom}</span>
        </label>
        <label className="panel-row">
          <span>거리</span>
          <input
            type="range"
            min={8}
            max={24}
            step={1}
            value={cameraDistance}
            onChange={(event) => {
              const value = Number(event.target.value)
              setCameraDistance(value)
              localStorage.setItem('cameraDistance', String(value))
            }}
          />
          <span className="panel-value">{cameraDistance}</span>
        </label>
      </div>
      <div className="hint">바닥 클릭으로 생성, 우클릭으로 블록 삭제.</div>
      {!nicknameReady && (
        <div className="overlay">
          <div className="modal">
            <div className="modal-title">닉네임 설정</div>
            <p className="modal-text">슬리더.io처럼 닉네임만 입력하고 시작합니다.</p>
            <input
              type="text"
              placeholder="닉네임 입력"
              value={nicknameInput}
              maxLength={16}
              onChange={(event) => setNicknameInput(event.target.value)}
            />
            <div className="color-palette">
              {PALETTE.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={playerColor === color ? 'active' : ''}
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    localStorage.setItem('playerColor', color)
                    setPlayerColor(color)
                  }}
                  aria-label={`색상 ${color}`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                const trimmed = nicknameInput.trim()
                if (!trimmed) return
                localStorage.setItem('nickname', trimmed)
                setNickname(trimmed)
                setNicknameReady(true)
              }}
            >
              시작하기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
