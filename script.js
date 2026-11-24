// Danh sách 46 học sinh lớp 10A9 chuẩn
const defaultClassData = {
  "10A9": [
    "Đinh Thế Anh", "Nguyễn Thị Phương Anh", "Vũ Ngọc Lan Anh", "Phạm Khắc Bách", 
    "Nguyễn Gia Bảo", "Nguyễn Phương Chi", "Nguyễn Minh Chiến", "Nguyễn Phúc Cường", 
    "Bùi Đức Đại", "Trần Nguyễn Thu Giang", "Nguyễn Thị Hải Hà", "Hoàng Thị Hạnh", 
    "Nguyễn Gia Hân", "Trần Minh Hiếu", "Nguyễn Đăng Hùng", "Nguyễn Thị Thu Hường", 
    "Phạm Duy Khánh", "Nguyễn Thùy Linh", "Phạm Thị Bảo Linh", "Phùng Thuỳ Linh", 
    "Vũ Thị Thùy Linh", "Nguyễn Thị Ngọc Mai", "Trần Thị Khánh Mai", "Nguyễn Hoàng Nam", 
    "Nguyễn Thị Quỳnh Nga", "Lê Thanh Ngân", "Phạm Đức Nghĩa", "Nguyễn Mai Ngọc", 
    "Nguyễn Thị Thanh Nhàn", "Phạm Thiên Phúc", "Nguyễn Xuân Quân", "Lê Hồng Sơn", 
    "Lê Thành Sơn", "Đinh Thị Thanh", "Nguyễn Đức Thành", "Lê Thanh Thảo", 
    "Nguyễn Phương Thảo", "Lê Bảo Trang", "Lê Thu Trang", "Đặng Minh Triết", 
    "Nguyễn Ngọc Bách Tùng", "Khương Thị Lâm Vi", "Nguyễn Thị Tường Vi", "Lê Văn Vũ", 
    "Nguyễn Công Anh Vũ", "Nguyễn Ngọc Tường Vy"
  ]
};

let allClasses = {};
let currentClass = "";
let currentGameMode = "duck"; // 'duck' hoặc 'fish'
let calledStudentsMap = {};
let isCatching = false;

// --- BIẾN THẾ GIỚI 3D ---
let scene, camera, renderer;
let worldGroup; // Chứa cảnh vật của chế độ hiện tại
let netGroup;   // Chiếc vợt 3D nâng cấp
let rodGroup;   // Cần câu 3D
let ducks3D = [];
let fishes3D = [];
let targetRingMesh;
let lakeWaterMesh;

// Biến riêng cho chế độ Câu Cá 3D
let fishingState = 'idle'; // 'idle' | 'casted' | 'biting'
let bobberMesh;
let fishingLineMesh;
let biteTimer = 0;
let bitingFishObj = null;

let isPlayingActive = false;
let isPointerLocked = false;
let isDraggingMouse = false;
let lastMouseX = 0;
let lastMouseY = 0;
let animId = null;
let prevTime = performance.now();

// Điều khiển di chuyển FPS
const keys = { w: false, a: false, s: false, d: false, space: false };
let yaw = 0;
let pitch = 0;
let velocityY = 0;
let isGrounded = true;
const PLAYER_HEIGHT = 2.3;
let currentBounds = { minX: -36, maxX: 36, minZ: -36, maxZ: 36 };

// Hoạt ảnh tay cầm dụng cụ
let swingProgress = 0;
let isSwinging = false;
let walkBobTime = 0;

// --- HỆ THỐNG ÂM THANH ---
let audioCtx = null;
function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playSound(type) {
  initAudio();
  if (!audioCtx) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  const now = audioCtx.currentTime;

  if (type === 'swing') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(75, now + 0.22);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.22);
    osc.start(now);
    osc.stop(now + 0.22);
  } else if (type === 'quack') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(270, now);
    osc.frequency.linearRampToValueAtTime(185, now + 0.14);
    osc.frequency.setValueAtTime(285, now + 0.18);
    osc.frequency.linearRampToValueAtTime(170, now + 0.36);
    gain.gain.setValueAtTime(0.26, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.38);
    osc.start(now);
    osc.stop(now + 0.38);
  } else if (type === 'splash') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.3);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
    osc.start(now);
    osc.stop(now + 0.3);
  } else if (type === 'bite') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.setValueAtTime(720, now + 0.12);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.28);
    osc.start(now);
    osc.stop(now + 0.28);
  }
}

// --- KHỞI TẠO ---
window.addEventListener('DOMContentLoaded', () => {
  loadStorageData();
  populateDropdown();
  initThreeEngine();
  setupFPSControls();
});

function loadStorageData() {
  const savedClasses = localStorage.getItem('spooky_classes');
  const savedCalled = localStorage.getItem('spooky_called_map');
  allClasses = savedClasses ? JSON.parse(savedClasses) : { ...defaultClassData };
  calledStudentsMap = savedCalled ? JSON.parse(savedCalled) : {};
}

function saveStorageData() {
  localStorage.setItem('spooky_classes', JSON.stringify(allClasses));
  localStorage.setItem('spooky_called_map', JSON.stringify(calledStudentsMap));
}

// --- BƯỚC 1 -> BƯỚC 2: CHỌN TRÒ CHƠI ---
function selectGameMode(mode) {
  currentGameMode = mode;
  document.getElementById('gameSelectScreen').classList.add('hidden');
  document.getElementById('classSelectScreen').classList.remove('hidden');

  const pill = document.getElementById('selectedModeLabel');
  if (mode === 'duck') {
    pill.textContent = '🦆 Chế độ: Săn Vịt Đồng Cỏ 3D';
  } else {
    pill.textContent = '🎣 Chế độ: Câu Cá Bến Hồ 3D';
  }
  populateDropdown();
}

function backToGameSelect() {
  document.getElementById('classSelectScreen').classList.add('hidden');
  document.getElementById('gameSelectScreen').classList.remove('hidden');
}

function populateDropdown() {
  const select = document.getElementById('classDropdown');
  select.innerHTML = '';
  Object.keys(allClasses).forEach(className => {
    const opt = document.createElement('option');
    opt.value = className;
    opt.textContent = `Lớp ${className} (${allClasses[className].length} học sinh)`;
    select.appendChild(opt);
  });
}

// --- BƯỚC 2 -> BƯỚC 3: VÀO GAME VỚI LỚP ĐÃ CHỌN ---
function enterGameWithSelectedClass() {
  const select = document.getElementById('classDropdown');
  currentClass = select.value;
  if (!currentClass) {
    alert('Vui lòng chọn 1 lớp!');
    return;
  }
  if (!calledStudentsMap[currentClass]) {
    calledStudentsMap[currentClass] = [];
  }

  document.getElementById('currentClassTitle').textContent = `Lớp ${currentClass}`;
  document.getElementById('classSelectScreen').classList.add('hidden');
  document.getElementById('gameScreen').classList.remove('hidden');

  // Cập nhật hướng dẫn HUD theo từng game
  const banner = document.getElementById('fishingBanner');
  banner.classList.add('hidden');
  fishingState = 'idle';

  if (currentGameMode === 'duck') {
    document.getElementById('lockModeIcon').textContent = '🥅';
    document.getElementById('lockModeTitle').textContent = 'Săn Vịt Đồng Cỏ 3D';
    document.getElementById('actionHintText').textContent = 'Vung vợt bắt vịt';
    document.getElementById('hudBottomTip').textContent = 'Lại gần vịt đến khi hiện vòng sáng dưới chân rồi Click chuột trái để bắt';
    buildDuckFarmScene();
  } else {
    document.getElementById('lockModeIcon').textContent = '🎣';
    document.getElementById('lockModeTitle').textContent = 'Câu Cá Bến Hồ 3D';
    document.getElementById('actionHintText').textContent = 'Quăng câu / Giật cần';
    document.getElementById('hudBottomTip').textContent = 'Hướng ra mặt hồ, Click chuột trái để quăng câu; khi cá cắn phao hãy Click lần nữa để giật cần!';
    buildFishingLakeScene();
  }

  requestAnimationFrame(() => {
    onWindowResize();
    updateCountersAndEntities();
    startGameLoop();
  });
}

function goToClassSelect() {
  isPlayingActive = false;
  exitPointerLock();
  if (animId) cancelAnimationFrame(animId);
  document.getElementById('gameScreen').classList.add('hidden');
  document.getElementById('classSelectScreen').classList.remove('hidden');
  populateDropdown();
}

function updateCountersAndEntities() {
  const students = allClasses[currentClass] || [];
  const called = calledStudentsMap[currentClass] || [];
  const uncalled = students.filter(s => !called.includes(s));

  document.getElementById('remainingCount').textContent = uncalled.length;
  document.getElementById('calledCount').textContent = called.length;

  if (currentGameMode === 'duck') {
    spawn3DDucks(uncalled.length);
  } else {
    spawn3DFishes(uncalled.length);
  }
}

// --- KHỞI TẠO ENGINE THREE.JS ---
function initThreeEngine() {
  const container = document.getElementById('threeContainer');

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(68, 16 / 9, 0.1, 180);
  camera.rotation.order = 'YXZ';

  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  container.appendChild(renderer.domElement);

  worldGroup = new THREE.Group();
  scene.add(worldGroup);

  // Vòng sáng báo hiệu mục tiêu dưới chân vịt
  const ringGeo = new THREE.RingGeometry(0.65, 0.88, 32);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9
  });
  targetRingMesh = new THREE.Mesh(ringGeo, ringMat);
  targetRingMesh.rotation.x = -Math.PI / 2;
  targetRingMesh.visible = false;
  scene.add(targetRingMesh);

  // Tạo sẵn 2 dụng cụ góc nhìn thứ nhất: Vợt đẹp & Cần câu
  buildUpgradedNet();
  buildFishingRod();
  camera.add(netGroup);
  camera.add(rodGroup);
  scene.add(camera);

  window.addEventListener('resize', onWindowResize);
}

function clearWorldGroup() {
  while (worldGroup.children.length > 0) {
    worldGroup.remove(worldGroup.children[0]);
  }
  ducks3D = [];
  fishes3D = [];
  targetRingMesh.visible = false;
  if (bobberMesh) {
    scene.remove(bobberMesh);
    bobberMesh = null;
  }
  if (fishingLineMesh) {
    scene.remove(fishingLineMesh);
    fishingLineMesh = null;
  }
}

// --- TEXTURE THỦ CÔNG SẮC NÉT ---
function createProceduralGrassTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#3b7a33';
  ctx.fillRect(0, 0, 256, 256);

  const shades = ['#2f6629', '#488c3f', '#559e4b', '#336e2c', '#63ab54'];
  for (let i = 0; i < 4500; i++) {
    ctx.fillStyle = shades[Math.floor(Math.random() * shades.length)];
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 3 + Math.random() * 5);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(22, 22);
  return tex;
}

function createProceduralWoodTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#78482a';
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 70; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(40, 20, 8, 0.28)' : 'rgba(165, 110, 68, 0.22)';
    ctx.fillRect(Math.random() * 128, 0, 1.5 + Math.random() * 3, 128);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// --- NÂNG CẤP CHIẾC VỢT BẮT VỊT ĐẸP & CHÂN THỰC HƠN ---
function buildUpgradedNet() {
  netGroup = new THREE.Group();

  const woodTex = createProceduralWoodTexture();
  const handleMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.55 });
  const gripMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.82, roughness: 0.22 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.65, roughness: 0.28 });

  // 1. Tay cầm bọc cao su đen chống trượt ở đuôi cán
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.04, 0.38, 16), gripMat);
  grip.position.set(0, -0.78, 0);
  netGroup.add(grip);

  // Nút bịt đồng cuối cán
  const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.042, 16, 12), brassMat);
  pommel.position.set(0, -0.97, 0);
  netGroup.add(pommel);

  // 2. Thân cán gỗ sồi thon gọn
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.035, 1.05, 16), handleMat);
  shaft.position.set(0, -0.08, 0);
  netGroup.add(shaft);

  // 3. Khớp nối chữ Y bằng đồng thau sang trọng
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.032, 0.14, 16), brassMat);
  collar.position.set(0, 0.46, 0);
  netGroup.add(collar);

  const forkLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.24, 12), brassMat);
  forkLeft.position.set(-0.08, 0.58, 0.02);
  forkLeft.rotation.z = 0.38;
  forkLeft.rotation.x = 0.15;

  const forkRight = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.24, 12), brassMat);
  forkRight.position.set(0.08, 0.58, 0.02);
  forkRight.rotation.z = -0.38;
  forkRight.rotation.x = 0.15;
  netGroup.add(forkLeft, forkRight);

  // 4. Vành vợt oval mềm mại
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.022, 16, 40), rimMat);
  rim.scale.set(0.92, 1.15, 1);
  rim.position.set(0, 0.98, 0.12);
  rim.rotation.x = Math.PI / 2.25;
  netGroup.add(rim);

  // 5. Túi lưới 2 lớp: lớp lưới mịn mờ + lớp mắt lưới đan chéo
  const innerBag = new THREE.Mesh(
    new THREE.SphereGeometry(0.37, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.62),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      transparent: true,
      opacity: 0.26,
      side: THREE.DoubleSide
    })
  );
  innerBag.scale.set(0.92, 1.45, 1.15);
  innerBag.position.set(0, 0.96, 0.12);
  innerBag.rotation.x = Math.PI + Math.PI / 2.25;
  netGroup.add(innerBag);

  const wireBag = new THREE.Mesh(
    new THREE.SphereGeometry(0.372, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.62),
    new THREE.MeshBasicMaterial({
      color: 0xfef3c7,
      wireframe: true,
      transparent: true,
      opacity: 0.45
    })
  );
  wireBag.scale.set(0.92, 1.45, 1.15);
  wireBag.position.set(0, 0.96, 0.12);
  wireBag.rotation.x = Math.PI + Math.PI / 2.25;
  netGroup.add(wireBag);

  netGroup.position.set(0.66, -0.52, -1.05);
  netGroup.rotation.set(0.28, -0.22, 0.2);
}

// --- TẠO CẦN CÂU 3D GÓC NHÌN THỨ NHẤT ---
function buildFishingRod() {
  rodGroup = new THREE.Group();

  const corkMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.85 });
  const carbonMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.5 });
  const silverMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.2 });

  // Tay cầm bần
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 0.45, 14), corkMat);
  grip.position.set(0, -0.45, 0);
  rodGroup.add(grip);

  // Máy quay cước (Reel)
  const reelBody = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.09, 16), silverMat);
  reelBody.rotation.z = Math.PI / 2;
  reelBody.position.set(-0.05, -0.25, -0.04);
  rodGroup.add(reelBody);

  // Thân cần câu vươn dài
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.025, 2.2, 12), carbonMat);
  shaft.position.set(0, 0.75, -0.15);
  shaft.rotation.x = -0.14;
  rodGroup.add(shaft);

  // Các khoen dẫn dây
  [0.2, 0.75, 1.3, 1.82].forEach((h, idx) => {
    const guide = new THREE.Mesh(new THREE.TorusGeometry(0.022 - idx * 0.003, 0.003, 8, 16), silverMat);
    guide.position.set(0, h, -0.07 - h * 0.14);
    rodGroup.add(guide);
  });

  rodGroup.position.set(0.58, -0.45, -0.95);
  rodGroup.rotation.set(0.55, -0.15, 0.12);
  rodGroup.visible = false;
}

// =========================================================================
// CẢNH 1: SĂN VỊT ĐỒNG CỎ 3D
// =========================================================================
function buildDuckFarmScene() {
  clearWorldGroup();
  netGroup.visible = true;
  rodGroup.visible = false;

  scene.background = new THREE.Color(0x93c5fd);
  scene.fog = new THREE.FogExp2(0xbad6eb, 0.011);

  currentBounds = { minX: -36, maxX: 36, minZ: -36, maxZ: 36 };
  camera.position.set(0, PLAYER_HEIGHT, 24);
  yaw = 0;
  pitch = -0.06;

  // Ánh sáng
  const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x365314, 0.75);
  const dirLight = new THREE.DirectionalLight(0xfff3d6, 1.15);
  dirLight.position.set(32, 48, 25);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  const d = 48;
  dirLight.shadow.camera.left = -d; dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d; dirLight.shadow.camera.bottom = -d;
  worldGroup.add(hemiLight, dirLight);

  // Mặt cỏ
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(140, 140),
    new THREE.MeshStandardMaterial({ map: createProceduralGrassTexture(), roughness: 0.92 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  worldGroup.add(ground);

  // Ao nhỏ + đá cuội
  const pondGroup = new THREE.Group();
  pondGroup.position.set(-16, 0, -12);
  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(6.8, 6.8, 0.12, 28),
    new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.15, metalness: 0.35 })
  );
  water.scale.set(1.2, 1, 0.85);
  water.position.y = 0.05;
  pondGroup.add(water);

  const rockMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.85 });
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6, 0), rockMat);
    rock.position.set(Math.cos(a) * 8.4, 0.25, Math.sin(a) * 6.0);
    rock.castShadow = true;
    pondGroup.add(rock);
  }
  worldGroup.add(pondGroup);

  // Hàng rào gỗ
  const woodMat = new THREE.MeshStandardMaterial({ map: createProceduralWoodTexture(), roughness: 0.85 });
  const limit = 37.5;
  for (let i = -limit; i <= limit; i += 3.2) {
    [[i, 1.05, -limit], [i, 1.05, limit], [-limit, 1.05, i], [limit, 1.05, i]].forEach(([x, y, z]) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.38, 2.1, 0.38), woodMat);
      post.position.set(x, y, z);
      post.castShadow = true;
      worldGroup.add(post);
    });
  }
  const barH = new THREE.Mesh(new THREE.BoxGeometry(limit * 2, 0.22, 0.16), woodMat);
  [1.5, 0.75].forEach(h => {
    const b1 = barH.clone(); b1.position.set(0, h, -limit);
    const b2 = barH.clone(); b2.position.set(0, h, limit);
    const b3 = barH.clone(); b3.rotation.y = Math.PI / 2; b3.position.set(-limit, h, 0);
    const b4 = barH.clone(); b4.rotation.y = Math.PI / 2; b4.position.set(limit, h, 0);
    worldGroup.add(b1, b2, b3, b4);
  });

  // Chuồng trại đỏ & Cây
  const barnGroup = new THREE.Group();
  const wall = new THREE.Mesh(new THREE.BoxGeometry(14, 7.5, 11), new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.75 }));
  wall.position.y = 3.75; wall.castShadow = true;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(10.5, 5, 4), new THREE.MeshStandardMaterial({ color: 0x3f2e26, roughness: 0.85 }));
  roof.position.y = 9.9; roof.rotation.y = Math.PI / 4;
  barnGroup.add(wall, roof);
  barnGroup.position.set(16, 0, -46);
  worldGroup.add(barnGroup);

  addSurroundingTrees(worldGroup);
}

function addSurroundingTrees(parentGroup) {
  const treeCoords = [[-28, -44], [-44, -12], [-43, 22], [44, -20], [43, 18], [-4, -48], [34, -44]];
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.9 });
  const leafDark = new THREE.MeshStandardMaterial({ color: 0x1e4d2b, roughness: 0.85 });
  const leafLight = new THREE.MeshStandardMaterial({ color: 0x2d6a3e, roughness: 0.8 });

  treeCoords.forEach(([tx, tz]) => {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.7, 4.5, 8), trunkMat);
    trunk.position.y = 2.25; trunk.castShadow = true;
    const c1 = new THREE.Mesh(new THREE.DodecahedronGeometry(3.1, 1), leafDark);
    c1.position.y = 5.5; c1.castShadow = true;
    const c2 = new THREE.Mesh(new THREE.DodecahedronGeometry(2.3, 1), leafLight);
    c2.position.set(0.6, 7.2, 0.4); c2.castShadow = true;
    tree.add(trunk, c1, c2);
    tree.position.set(tx, 0, tz);
    parentGroup.add(tree);
  });
}

function createDetailedDuckMesh() {
  const duck = new THREE.Group();
  const variant = Math.random();
  let bodyColor = 0xf8fafc, headColor = 0xf8fafc;
  if (variant < 0.35) { bodyColor = 0xfde047; headColor = 0xfde047; }
  else if (variant < 0.65) { bodyColor = 0xe2e8f0; headColor = 0x14532d; }

  const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.75 });
  const headMat = new THREE.MeshStandardMaterial({ color: headColor, roughness: 0.7 });
  const beakMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.45 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.72, 1.25), bodyMat);
  body.position.y = 0.64; body.castShadow = true;
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.32, 0.4), bodyMat);
  tail.position.set(0, 0.85, -0.68); tail.rotation.x = 0.4;

  const wingGeo = new THREE.BoxGeometry(0.14, 0.48, 0.85);
  const leftWing = new THREE.Mesh(wingGeo, bodyMat); leftWing.position.set(-0.48, 0.68, -0.05);
  const rightWing = new THREE.Mesh(wingGeo, bodyMat); rightWing.position.set(0.48, 0.68, -0.05);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.64, 0.62), headMat);
  head.position.set(0, 1.24, 0.46); head.castShadow = true;
  const beak = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.42), beakMat);
  beak.position.set(0, 1.14, 0.92);

  const eyeBlackMat = new THREE.MeshBasicMaterial({ color: 0x090d16 });
  [-0.31, 0.31].forEach(side => {
    const eb = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.1, 0.1), eyeBlackMat);
    eb.position.set(side, 1.32, 0.63);
    duck.add(eb);
  });

  const legGeo = new THREE.BoxGeometry(0.15, 0.35, 0.26);
  const legL = new THREE.Mesh(legGeo, beakMat); legL.position.set(-0.22, 0.18, 0.05);
  const legR = new THREE.Mesh(legGeo, beakMat); legR.position.set(0.22, 0.18, 0.05);

  duck.add(body, tail, leftWing, rightWing, head, beak, legL, legR);
  return { mesh: duck, legL, legR, leftWing, rightWing };
}

function spawn3DDucks(count) {
  ducks3D.forEach(d => worldGroup.remove(d.mesh));
  ducks3D = [];

  for (let i = 0; i < count; i++) {
    const { mesh, legL, legR, leftWing, rightWing } = createDetailedDuckMesh();
    mesh.position.set((Math.random() - 0.5) * 58, 0, (Math.random() - 0.5) * 58);
    const angle = Math.random() * Math.PI * 2;
    const speed = 4.2 + Math.random() * 4.2;

    worldGroup.add(mesh);
    ducks3D.push({
      mesh, legL, legR, leftWing, rightWing,
      vx: Math.sin(angle) * speed,
      vz: Math.cos(angle) * speed,
      speed,
      changeTimer: Math.random() * 2 + 0.5,
      waddlePhase: Math.random() * 10
    });
  }
}

// =========================================================================
// CẢNH 2: CÂU CÁ BẾN HỒ 3D GÓC NHÌN THỨ NHẤT
// =========================================================================
function buildFishingLakeScene() {
  clearWorldGroup();
  netGroup.visible = false;
  rodGroup.visible = true;

  scene.background = new THREE.Color(0x7dd3fc);
  scene.fog = new THREE.FogExp2(0xbae6fd, 0.009);

  // Giới hạn đi lại trên bờ cỏ & cầu gỗ bến tàu
  currentBounds = { minX: -24, maxX: 24, minZ: 4, maxZ: 28 };
  camera.position.set(0, PLAYER_HEIGHT, 8);
  yaw = 0;
  pitch = -0.22;

  const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x1e3a8a, 0.85);
  const dirLight = new THREE.DirectionalLight(0xfffbeb, 1.15);
  dirLight.position.set(25, 45, 30);
  dirLight.castShadow = true;
  worldGroup.add(hemiLight, dirLight);

  // Bờ cỏ phía sau người chơi (z >= 9)
  const grassTex = createProceduralGrassTexture();
  grassTex.repeat.set(16, 8);
  const shore = new THREE.Mesh(
    new THREE.BoxGeometry(120, 1.4, 45),
    new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.9 })
  );
  shore.position.set(0, -0.5, 31);
  shore.receiveShadow = true;
  worldGroup.add(shore);

  // Đáy hồ cát vàng bên dưới nước
  const lakeBed = new THREE.Mesh(
    new THREE.PlaneGeometry(130, 110),
    new THREE.MeshStandardMaterial({ color: 0xd6c79c, roughness: 0.95 })
  );
  lakeBed.rotation.x = -Math.PI / 2;
  lakeBed.position.set(0, -2.2, -30);
  worldGroup.add(lakeBed);

  // Mặt hồ nước trong suốt nhìn xuyên thấy cá bơi bên dưới
  lakeWaterMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(130, 110),
    new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.12,
      metalness: 0.25,
      transparent: true,
      opacity: 0.58
    })
  );
  lakeWaterMesh.rotation.x = -Math.PI / 2;
  lakeWaterMesh.position.set(0, -0.05, -30);
  worldGroup.add(lakeWaterMesh);

  // Cầu gỗ bến tàu vươn ra mặt hồ (z từ 2 đến 11)
  const woodMat = new THREE.MeshStandardMaterial({ map: createProceduralWoodTexture(), roughness: 0.8 });
  for (let z = 2; z <= 11; z += 0.95) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.22, 0.85), woodMat);
    plank.position.set(0, 0.25, z);
    plank.castShadow = true;
    plank.receiveShadow = true;
    worldGroup.add(plank);
  }
  // Cọc gỗ 2 bên cầu
  [[-2.4, 2.2], [2.4, 2.2], [-2.4, 6.5], [2.4, 6.5], [-2.4, 10.5], [2.4, 10.5]].forEach(([px, pz]) => {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 2.2, 10), woodMat);
    pillar.position.set(px, 0.3, pz);
    worldGroup.add(pillar);
  });

  // Đá tảng & cây thông bên bờ đối diện
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85 });
  for (let i = -35; i <= 35; i += 6) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.4 + Math.random(), 0), rockMat);
    rock.position.set(i, 0.1, 8.5 + (Math.random() - 0.5));
    worldGroup.add(rock);
  }

  // Bờ bên kia hồ (z = -55)
  const farShore = new THREE.Mesh(
    new THREE.BoxGeometry(140, 4, 30),
    new THREE.MeshStandardMaterial({ color: 0x2d6a3e, roughness: 0.9 })
  );
  farShore.position.set(0, 1, -65);
  worldGroup.add(farShore);
}

function createMinecraftFishMesh() {
  const fish = new THREE.Group();
  const colors = [0xf97316, 0xef4444, 0xeab308, 0x38bdf8, 0xec4899, 0xa855f7];
  const color = colors[Math.floor(Math.random() * colors.length)];

  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4 });
  const finMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.5 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.65, 1.35), bodyMat);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.55, 0.55), finMat);
  tail.position.set(0, 0, -0.9);
  const dorsal = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.6), finMat);
  dorsal.position.set(0, 0.45, -0.1);

  fish.add(body, tail, dorsal);
  return { mesh: fish, tail };
}

function spawn3DFishes(count) {
  fishes3D.forEach(f => worldGroup.remove(f.mesh));
  fishes3D = [];

  for (let i = 0; i < count; i++) {
    const { mesh, tail } = createMinecraftFishMesh();
    const x = (Math.random() - 0.5) * 44;
    const z = -3 - Math.random() * 28; // Bơi dưới hồ nước (z < 0)
    const y = -0.6 - Math.random() * 1.1;
    mesh.position.set(x, y, z);

    const angle = Math.random() * Math.PI * 2;
    const speed = 2.5 + Math.random() * 2.5;

    worldGroup.add(mesh);
    fishes3D.push({
      mesh,
      tail,
      vx: Math.sin(angle) * speed,
      vz: Math.cos(angle) * speed,
      speed,
      changeTimer: Math.random() * 3 + 1,
      swimPhase: Math.random() * 10
    });
  }
}

// Quăng câu / Giật cần
function handleFishingAction() {
  if (isCatching) return;

  const students = allClasses[currentClass] || [];
  const called = calledStudentsMap[currentClass] || [];
  const uncalled = students.filter(s => !called.includes(s));

  if (uncalled.length === 0) {
    alert(`🎉 Đã gọi hết toàn bộ học sinh lớp ${currentClass}!`);
    return;
  }

  const banner = document.getElementById('fishingBanner');

  if (fishingState === 'idle') {
    // 1. Quăng phao xuống mặt hồ phía trước
    isSwinging = true;
    swingProgress = 0;
    playSound('splash');

    const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    let targetX = camera.position.x + forward.x * 11;
    let targetZ = camera.position.z + forward.z * 11;
    // Đảm bảo phao rơi xuống vùng nước (z <= 1)
    if (targetZ > 1) targetZ = -6;
    targetX = Math.max(-24, Math.min(24, targetX));
    targetZ = Math.max(-32, Math.min(1, targetZ));

    // Tạo phao câu đỏ trắng
    bobberMesh = new THREE.Group();
    const topBob = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), new THREE.MeshStandardMaterial({ color: 0xef4444 }));
    topBob.position.y = 0.08;
    const botBob = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    botBob.position.y = -0.05;
    bobberMesh.add(topBob, botBob);
    bobberMesh.position.set(targetX, -0.02, targetZ);
    scene.add(bobberMesh);

    // Tạo dây câu nối từ đầu cần tới phao
    const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    fishingLineMesh = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xffffff }));
    scene.add(fishingLineMesh);

    fishingState = 'casted';
    biteTimer = 1.6 + Math.random() * 1.8; // Cá cắn câu sau 1.6 - 3.4 giây
    banner.textContent = '🎣 Đang thả câu... Chờ cá bơi lại cắn phao!';
    banner.classList.remove('hidden', 'bite-alert');

  } else if (fishingState === 'casted') {
    // Giật sớm khi cá chưa cắn -> Thu cần
    cancelFishing();
    banner.textContent = '💨 Giật hơi sớm rồi! Click chuột trái để thả câu lại.';
    setTimeout(() => { if (fishingState === 'idle') banner.classList.add('hidden'); }, 1800);

  } else if (fishingState === 'biting') {
    // 2. Giật cần đúng lúc cá đang cắn -> Bắt trúng!
    isSwinging = true;
    swingProgress = 0;
    banner.classList.add('hidden');
    cancelFishing();
    triggerCatchStudent(0, 'fish');
  }
}

function cancelFishing() {
  fishingState = 'idle';
  bitingFishObj = null;
  if (bobberMesh) { scene.remove(bobberMesh); bobberMesh = null; }
  if (fishingLineMesh) { scene.remove(fishingLineMesh); fishingLineMesh = null; }
}

// --- ĐIỀU KHIỂN CHUNG (WASD + CHUỘT) ---
function startPlaying3D() {
  initAudio();
  isPlayingActive = true;
  document.getElementById('lockOverlay').classList.add('hidden');
  onWindowResize();

  try {
    if (renderer.domElement.requestPointerLock) {
      renderer.domElement.requestPointerLock();
    }
  } catch (err) {}
}

function exitPointerLock() {
  try {
    if (document.pointerLockElement) document.exitPointerLock();
  } catch (err) {}
}

function setupFPSControls() {
  document.addEventListener('pointerlockchange', () => {
    isPointerLocked = (document.pointerLockElement === renderer.domElement);
  });

  document.addEventListener('mousemove', (e) => {
    if (!isPlayingActive || isCatching) return;
    const sensitivity = 0.0026;
    if (isPointerLocked) {
      yaw -= e.movementX * sensitivity;
      pitch -= e.movementY * sensitivity;
      pitch = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, pitch));
    } else if (isDraggingMouse) {
      yaw -= (e.clientX - lastMouseX) * sensitivity * 1.4;
      pitch -= (e.clientY - lastMouseY) * sensitivity * 1.4;
      pitch = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, pitch));
    }
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  });

  document.addEventListener('keydown', (e) => {
    const code = e.code;
    if (code === 'KeyW' || code === 'ArrowUp') keys.w = true;
    if (code === 'KeyS' || code === 'ArrowDown') keys.s = true;
    if (code === 'KeyA' || code === 'ArrowLeft') keys.a = true;
    if (code === 'KeyD' || code === 'ArrowRight') keys.d = true;
    if (code === 'Space') keys.space = true;

    if (code === 'KeyE' && isPlayingActive) {
      performPrimaryAction();
    }
    if (code === 'Escape' && isPlayingActive) {
      isPlayingActive = false;
      exitPointerLock();
      document.getElementById('lockOverlay').classList.remove('hidden');
    }
  });

  document.addEventListener('keyup', (e) => {
    const code = e.code;
    if (code === 'KeyW' || code === 'ArrowUp') keys.w = false;
    if (code === 'KeyS' || code === 'ArrowDown') keys.s = false;
    if (code === 'KeyA' || code === 'ArrowLeft') keys.a = false;
    if (code === 'KeyD' || code === 'ArrowRight') keys.d = false;
    if (code === 'Space') keys.space = false;
  });

  let downX = 0, downY = 0;
  renderer.domElement.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    isDraggingMouse = true;
    downX = e.clientX; downY = e.clientY;
    lastMouseX = e.clientX; lastMouseY = e.clientY;

    if (isPointerLocked && isPlayingActive) {
      performPrimaryAction();
    }
  });

  window.addEventListener('mouseup', (e) => {
    if (e.button !== 0) return;
    if (isDraggingMouse && !isPointerLocked && isPlayingActive) {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) < 6) {
        performPrimaryAction();
      }
    }
    isDraggingMouse = false;
  });
}

function performPrimaryAction() {
  if (currentGameMode === 'duck') {
    swingNetAndCatch();
  } else {
    handleFishingAction();
  }
}

// --- LOGIC BẮT VỊT ---
function findDuckInReach() {
  const playerPos = camera.position.clone();
  const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);

  let hitDuckIndex = -1;
  let closestDist = 6.8;

  ducks3D.forEach((d, idx) => {
    const toDuck = new THREE.Vector3().subVectors(d.mesh.position, playerPos);
    toDuck.y = 0;
    const dist = toDuck.length();
    if (dist < closestDist) {
      toDuck.normalize();
      if (forward.dot(toDuck) > 0.35) {
        closestDist = dist;
        hitDuckIndex = idx;
      }
    }
  });
  return hitDuckIndex;
}

function swingNetAndCatch() {
  if (isSwinging || isCatching || ducks3D.length === 0) return;
  isSwinging = true;
  swingProgress = 0;
  playSound('swing');

  const hitDuckIndex = findDuckInReach();
  if (hitDuckIndex !== -1) {
    triggerCatchStudent(hitDuckIndex, 'duck');
  }
}

function quickCatchRandom() {
  const students = allClasses[currentClass] || [];
  const called = calledStudentsMap[currentClass] || [];
  const uncalled = students.filter(s => !called.includes(s));

  if (uncalled.length === 0) {
    alert(`🎉 Đã gọi hết toàn bộ học sinh lớp ${currentClass}!`);
    return;
  }
  cancelFishing();
  document.getElementById('fishingBanner').classList.add('hidden');
  triggerCatchStudent(0, currentGameMode);
}

function triggerCatchStudent(entityIndex, mode) {
  const students = allClasses[currentClass] || [];
  const called = calledStudentsMap[currentClass] || [];
  const uncalled = students.filter(s => !called.includes(s));
  if (uncalled.length === 0) return;

  isCatching = true;
  isPlayingActive = false;
  playSound('quack');

  const randomStudent = uncalled[Math.floor(Math.random() * uncalled.length)];

  if (mode === 'duck' && ducks3D[entityIndex]) {
    ducks3D[entityIndex].mesh.position.y = 1.6;
    ducks3D[entityIndex].mesh.scale.set(1.35, 1.35, 1.35);
  }

  setTimeout(() => {
    calledStudentsMap[currentClass].push(randomStudent);
    saveStorageData();
    exitPointerLock();
    showResultModal(randomStudent, mode);

    isCatching = false;
    updateCountersAndEntities();
  }, 260);
}

// --- VÒNG LẶP GAME 3D ---
function startGameLoop() {
  if (animId) cancelAnimationFrame(animId);
  prevTime = performance.now();

  function animate() {
    animId = requestAnimationFrame(animate);
    const now = performance.now();
    const dt = Math.min((now - prevTime) / 1000, 0.05);
    prevTime = now;

    updatePlayerMovement(dt);

    if (currentGameMode === 'duck') {
      updateDucksAI(dt);
      updateTargetHighlight();
    } else {
      updateFishesAndBobberAI(dt);
    }

    updateToolAnimation(dt);
    renderer.render(scene, camera);
  }
  animate();
}

function updateTargetHighlight() {
  const crosshair = document.getElementById('crosshair');
  if (!isPlayingActive || isCatching || ducks3D.length === 0) {
    targetRingMesh.visible = false;
    crosshair.classList.remove('in-range');
    return;
  }

  const idx = findDuckInReach();
  if (idx !== -1) {
    const d = ducks3D[idx];
    targetRingMesh.visible = true;
    targetRingMesh.position.set(d.mesh.position.x, 0.04, d.mesh.position.z);
    targetRingMesh.rotation.z += 0.04;
    crosshair.classList.add('in-range');
  } else {
    targetRingMesh.visible = false;
    crosshair.classList.remove('in-range');
  }
}

function updatePlayerMovement(dt) {
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;

  if (!isPlayingActive || isCatching) return;

  const moveSpeed = 12.0;
  const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

  let moveDir = new THREE.Vector3();
  if (keys.w) moveDir.add(forward);
  if (keys.s) moveDir.sub(forward);
  if (keys.d) moveDir.add(right);
  if (keys.a) moveDir.sub(right);

  if (moveDir.lengthSq() > 0) {
    moveDir.normalize();
    camera.position.x += moveDir.x * moveSpeed * dt;
    camera.position.z += moveDir.z * moveSpeed * dt;
    walkBobTime += dt * 11;
  }

  if (keys.space && isGrounded) {
    velocityY = 8.5;
    isGrounded = false;
  }

  velocityY -= 22 * dt;
  camera.position.y += velocityY * dt;

  if (camera.position.y <= PLAYER_HEIGHT) {
    camera.position.y = PLAYER_HEIGHT;
    velocityY = 0;
    isGrounded = true;
  }

  camera.position.x = Math.max(currentBounds.minX, Math.min(currentBounds.maxX, camera.position.x));
  camera.position.z = Math.max(currentBounds.minZ, Math.min(currentBounds.maxZ, camera.position.z));
}

function updateDucksAI(dt) {
  const playerPos = camera.position;
  ducks3D.forEach(d => {
    d.changeTimer -= dt;
    const dx = d.mesh.position.x - playerPos.x;
    const dz = d.mesh.position.z - playerPos.z;
    const dist = Math.hypot(dx, dz);

    if (dist < 6.8 && dist > 0.1) {
      d.vx = (dx / dist) * (d.speed * 1.25);
      d.vz = (dz / dist) * (d.speed * 1.25);
      d.changeTimer = 0.5;
    } else if (d.changeTimer <= 0) {
      const a = Math.random() * Math.PI * 2;
      d.vx = Math.sin(a) * d.speed;
      d.vz = Math.cos(a) * d.speed;
      d.changeTimer = Math.random() * 2.2 + 0.6;
    }

    d.mesh.position.x += d.vx * dt;
    d.mesh.position.z += d.vz * dt;

    if (d.mesh.position.x < -36) { d.mesh.position.x = -36; d.vx = Math.abs(d.vx); }
    if (d.mesh.position.x > 36)  { d.mesh.position.x = 36;  d.vx = -Math.abs(d.vx); }
    if (d.mesh.position.z < -36) { d.mesh.position.z = -36; d.vz = Math.abs(d.vz); }
    if (d.mesh.position.z > 36)  { d.mesh.position.z = 36;  d.vz = -Math.abs(d.vz); }

    d.mesh.rotation.y = Math.atan2(d.vx, d.vz);
    d.waddlePhase += dt * 16;
    d.legL.rotation.x = Math.sin(d.waddlePhase) * 0.6;
    d.legR.rotation.x = -Math.sin(d.waddlePhase) * 0.6;
    d.leftWing.rotation.z = Math.abs(Math.sin(d.waddlePhase * 0.5)) * 0.25;
    d.rightWing.rotation.z = -Math.abs(Math.sin(d.waddlePhase * 0.5)) * 0.25;
    d.mesh.rotation.z = Math.sin(d.waddlePhase) * 0.07;
  });
}

function updateFishesAndBobberAI(dt) {
  const banner = document.getElementById('fishingBanner');

  // Cập nhật đàn cá bơi dưới hồ
  fishes3D.forEach(f => {
    f.changeTimer -= dt;

    // Nếu đang thả phao, 1 con cá sẽ bơi hướng về phía phao
    if (fishingState !== 'idle' && bobberMesh && f === bitingFishObj) {
      const dx = bobberMesh.position.x - f.mesh.position.x;
      const dz = bobberMesh.position.z - f.mesh.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.6) {
        f.vx = (dx / dist) * 5.0;
        f.vz = (dz / dist) * 5.0;
      } else {
        f.vx *= 0.9;
        f.vz *= 0.9;
      }
    } else if (f.changeTimer <= 0) {
      const a = Math.random() * Math.PI * 2;
      f.vx = Math.sin(a) * f.speed;
      f.vz = Math.cos(a) * f.speed;
      f.changeTimer = Math.random() * 3 + 1;
    }

    f.mesh.position.x += f.vx * dt;
    f.mesh.position.z += f.vz * dt;

    if (f.mesh.position.x < -28) { f.mesh.position.x = -28; f.vx = Math.abs(f.vx); }
    if (f.mesh.position.x > 28)  { f.mesh.position.x = 28;  f.vx = -Math.abs(f.vx); }
    if (f.mesh.position.z < -34) { f.mesh.position.z = -34; f.vz = Math.abs(f.vz); }
    if (f.mesh.position.z > -1.5){ f.mesh.position.z = -1.5;f.vz = -Math.abs(f.vz); }

    f.mesh.rotation.y = Math.atan2(f.vx, f.vz);
    f.swimPhase += dt * 14;
    f.tail.rotation.y = Math.sin(f.swimPhase) * 0.45;
  });

  // Cập nhật phao câu & dây câu
  if (fishingState !== 'idle' && bobberMesh) {
    if (fishingState === 'casted') {
      biteTimer -= dt;
      bobberMesh.position.y = -0.02 + Math.sin(performance.now() * 0.005) * 0.04;

      if (!bitingFishObj && fishes3D.length > 0) {
        bitingFishObj = fishes3D[Math.floor(Math.random() * fishes3D.length)];
      }

      if (biteTimer <= 0) {
        fishingState = 'biting';
        playSound('bite');
        banner.textContent = '🐟 CÁ CẮN CÂU RỒI! CLICK CHUỘT TRÁI (HOẶC PHÍM E) ĐỂ GIẬT CẦN!';
        banner.classList.add('bite-alert');
      }
    } else if (fishingState === 'biting') {
      // Phao giật mạnh lên xuống dưới mặt nước
      bobberMesh.position.y = -0.18 + Math.sin(performance.now() * 0.03) * 0.14;
    }

    // Nối dây câu từ đầu cần câu tới phao
    if (fishingLineMesh) {
      const tipLocal = new THREE.Vector3(0, 1.85, -0.45);
      const tipWorld = tipLocal.applyMatrix4(rodGroup.matrixWorld);
      fishingLineMesh.geometry.setFromPoints([tipWorld, bobberMesh.position]);
    }
  }
}

function updateToolAnimation(dt) {
  const bobY = Math.sin(walkBobTime) * 0.025;
  const bobX = Math.cos(walkBobTime * 0.5) * 0.025;

  if (currentGameMode === 'duck' && netGroup) {
    if (isSwinging) {
      swingProgress += dt * 5.5;
      if (swingProgress >= 1) { isSwinging = false; swingProgress = 0; }
      const c = Math.sin(swingProgress * Math.PI);
      netGroup.position.set(0.66 - c * 0.45, -0.52 - c * 0.15, -1.05 - c * 0.45);
      netGroup.rotation.set(0.28 - c * 1.25, -0.22 + c * 0.4, 0.2 + c * 0.5);
    } else {
      netGroup.position.set(0.66 + bobX, -0.52 + bobY, -1.05);
      netGroup.rotation.set(0.28, -0.22, 0.2);
    }
  } else if (currentGameMode === 'fish' && rodGroup) {
    if (isSwinging) {
      swingProgress += dt * 4.5;
      if (swingProgress >= 1) { isSwinging = false; swingProgress = 0; }
      const c = Math.sin(swingProgress * Math.PI);
      rodGroup.rotation.set(0.55 - c * 0.85, -0.15, 0.12);
    } else {
      rodGroup.position.set(0.58 + bobX, -0.45 + bobY, -0.95);
      rodGroup.rotation.set(0.55, -0.15, 0.12);
    }
  }
}

function onWindowResize() {
  const wrapper = document.getElementById('viewportWrapper');
  if (!wrapper || !renderer) return;
  const w = wrapper.clientWidth || window.innerWidth;
  const h = wrapper.clientHeight || window.innerHeight;
  if (w > 0 && h > 0) {
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
}

// --- MODAL KẾT QUẢ & QUẢN LÝ LỚP ---
function showResultModal(name, mode) {
  document.getElementById('selectedStudentName').textContent = name;
  if (mode === 'duck') {
    document.getElementById('resultBadge').textContent = '🎯 ĐÃ BẮT TRÚNG MỤC TIÊU';
    document.getElementById('resultAvatar').textContent = '🦆';
  } else {
    document.getElementById('resultBadge').textContent = '🎣 CÂU ĐƯỢC CÁ LỚN';
    document.getElementById('resultAvatar').textContent = '🐟';
  }

  document.getElementById('resultModal').classList.add('active');

  if (typeof confetti === 'function') {
    confetti({ particleCount: 80, spread: 75, colors: ['#f59e0b', '#10b981', '#38bdf8', '#ffffff'] });
  }
}

function closeResultModal() {
  document.getElementById('resultModal').classList.remove('active');
  startPlaying3D();
}

function openClassManager() {
  isPlayingActive = false;
  exitPointerLock();
  document.getElementById('managerModalTitle').textContent = `Danh sách lớp ${currentClass}`;
  const textarea = document.getElementById('studentListInput');
  textarea.value = (allClasses[currentClass] || []).join('\n');
  document.getElementById('managerModal').classList.add('active');
}

function closeClassManager() {
  document.getElementById('managerModal').classList.remove('active');
  document.getElementById('lockOverlay').classList.remove('hidden');
}

function saveStudentList() {
  const text = document.getElementById('studentListInput').value;
  const newList = text.split('\n').map(s => s.trim()).filter(s => s.length > 0);
  allClasses[currentClass] = newList;
  calledStudentsMap[currentClass] = (calledStudentsMap[currentClass] || []).filter(name => newList.includes(name));
  saveStorageData();
  updateCountersAndEntities();
  closeClassManager();
  alert(`Đã cập nhật danh sách lớp ${currentClass}!`);
}

function resetCalledList() {
  if (confirm(`Làm mới lượt gọi của lớp ${currentClass} để chơi lại từ đầu?`)) {
    calledStudentsMap[currentClass] = [];
    saveStorageData();
    updateCountersAndEntities();
    closeClassManager();
  }
}