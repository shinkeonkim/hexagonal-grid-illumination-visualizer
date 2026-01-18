/**
 * HexGrid Class
 * Implements hexagonal grid logic for the "Illumination" problem.
 * Correctly handles coordinates, perimeter detection using DFS from outside,
 * and high-quality canvas rendering with glassmorphism effects.
 */
class HexGrid {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // Grid properties
        this.W = 0; // Width (cols)
        this.H = 0; // Height (rows)
        this.grid = []; // (H+2) x (W+2) matrix, 1 for building, 0 for empty
        this.isVisited = []; // For DFS
        this.perimeterEdges = []; // Store edges to draw: [{x, y, dirIndex}, ...]
        
        // Visual properties
        this.hexSize = 30; // Radius
        this.showCoords = true;
        this.padding = 40;
        
        // Computed dimensions
        this.hexWidth = Math.sqrt(3) * this.hexSize;
        this.hexHeight = 2 * this.hexSize;
        this.vSpacing = 1.5 * this.hexSize;
        this.hSpacing = this.hexWidth;
        
        // Directions matching solution.cpp
        // Direction order: 0:Right, 1:Bottom-Right, 2:Bottom-Left, 3:Left, 4:Top-Left, 5:Top-Right
        this.dx = [
            [1, 0, -1, -1, -1, 0], // y % 2 == 0 (Even Row)
            [1, 1, 0, -1, 0, 1]    // y % 2 == 1 (Odd Row)
        ];
        this.dy = [
            [0, 1, 1, 0, -1, -1],  // y % 2 == 0
            [0, 1, 1, 0, -1, -1]   // y % 2 == 1
        ];

        this.setupEventListeners();
        this.initEmptyGrid(8, 4); // Default grid matching example 1
    }

    initEmptyGrid(W, H) {
        this.W = W;
        this.H = H;
        // (H+2) x (W+2) padding for easy DFS from outside (0,0)
        this.grid = Array.from({ length: H + 2 }, () => Array(W + 2).fill(0));
        this.resizeCanvas();
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousedown', (e) => this.handleClick(e));
        document.getElementById('load-btn').addEventListener('click', () => this.loadFromInput());
        document.getElementById('toggle-coords').addEventListener('click', () => {
            this.showCoords = !this.showCoords;
            document.getElementById('coord-display').textContent = this.showCoords ? '활성화' : '비활성화';
            this.draw();
        });
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        const totalWidth = (this.W + 1.5) * this.hSpacing + this.padding * 2;
        const totalHeight = (this.H + 1) * this.vSpacing + this.hexSize * 0.5 + this.padding * 2;
        
        this.canvas.width = totalWidth;
        this.canvas.height = totalHeight;
        this.draw();
    }

    loadFromInput() {
        const input = document.getElementById('grid-input').value.trim();
        if (!input) return;

        const lines = input.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length < 2) return;

        const [W, H] = lines[0].split(/\s+/).map(Number);
        this.W = W;
        this.H = H;
        this.grid = Array.from({ length: H + 2 }, () => Array(W + 2).fill(0));

        for (let i = 1; i <= H; i++) {
            const rowData = lines[i].split(/\s+/).map(Number);
            for (let j = 1; j <= W; j++) {
                this.grid[i][j] = rowData[j - 1] || 0;
            }
        }

        this.resizeCanvas();
    }

    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX * (this.canvas.width / rect.width) - (this.padding + this.hSpacing/2);
        const mouseY = e.clientY * (this.canvas.height / rect.height) - (this.padding + this.hexSize);

        // More accurate hex picking could be used, but this is fine for now
        let bestDist = Infinity;
        let bestPos = null;

        for (let y = 1; y <= this.H; y++) {
            for (let x = 1; x <= this.W; x++) {
                const { cx, cy } = this.getHexCenter(x, y);
                const rect = this.canvas.getBoundingClientRect();
                const actualMouseX = e.clientX - rect.left;
                const actualMouseY = e.clientY - rect.top;
                
                const dist = Math.hypot(actualMouseX - cx, actualMouseY - cy);
                if (dist < this.hexSize && dist < bestDist) {
                    bestDist = dist;
                    bestPos = { x, y };
                }
            }
        }

        if (bestPos) {
            this.grid[bestPos.y][bestPos.x] = 1 - this.grid[bestPos.y][bestPos.x];
            this.draw();
        }
    }

    getHexCenter(x, y) {
        const rowOffset = (y % 2 === 1) ? this.hSpacing / 2 : 0;
        const cx = x * this.hSpacing + rowOffset + this.padding;
        const cy = y * this.vSpacing + this.padding;
        return { cx, cy };
    }

    getHexVertices(cx, cy) {
        const vertices = [];
        for (let i = 0; i < 6; i++) {
            // Pointy-top hex
            const angleDeg = 60 * i - 30;
            const angleRad = (Math.PI / 180) * angleDeg;
            vertices.push({
                x: cx + this.hexSize * Math.cos(angleRad),
                y: cy + this.hexSize * Math.sin(angleRad)
            });
        }
        return vertices;
    }

    computePerimeter() {
        this.isVisited = Array.from({ length: this.H + 2 }, () => Array(this.W + 2).fill(false));
        this.perimeterEdges = [];
        let totalCount = 0;

        const dfs = (y, x) => {
            if (this.grid[y][x] === 1 || this.isVisited[y][x]) return;
            this.isVisited[y][x] = true;

            for (let d = 0; d < 6; d++) {
                const ny = y + this.dy[y % 2][d];
                const nx = x + this.dx[y % 2][d];

                if (ny < 0 || nx < 0 || ny > this.H + 1 || nx > this.W + 1) continue;

                if (this.grid[ny][nx] === 1) {
                    const backDir = (d + 3) % 6;
                    this.perimeterEdges.push({ x: nx, y: ny, dir: backDir });
                    totalCount++;
                } else {
                    dfs(ny, nx);
                }
            }
        };

        dfs(0, 0);
        return totalCount;
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const totalPerimeter = this.computePerimeter();
        const infoSpan = document.getElementById('total-length');
        if (infoSpan) infoSpan.textContent = totalPerimeter;

        // 1. Draw Hexagons first
        for (let y = 1; y <= this.H; y++) {
            for (let x = 1; x <= this.W; x++) {
                const { cx, cy } = this.getHexCenter(x, y);
                this.drawHexagonBody(cx, cy, this.grid[y][x] === 1, x, y);
            }
        }

        // 2. Draw Perimeter Edges on top
        this.drawPerimeter();
    }

    drawHexagonBody(cx, cy, isWall, x, y) {
        const vertices = this.getHexVertices(cx, cy);
        
        this.ctx.beginPath();
        this.ctx.moveTo(vertices[0].x, vertices[0].y);
        for (let i = 1; i < 6; i++) {
            this.ctx.lineTo(vertices[i].x, vertices[i].y);
        }
        this.ctx.closePath();

        if (isWall) {
            this.ctx.fillStyle = 'rgba(100, 100, 100, 0.7)';
        } else {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        }
        this.ctx.fill();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        if (this.showCoords) {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            this.ctx.font = '10px Inter, Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`${x},${y}`, cx, cy);
        }
    }

    drawPerimeter() {
        this.ctx.strokeStyle = '#ff3b30';
        this.ctx.lineWidth = 4;
        this.ctx.lineCap = 'round';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = 'rgba(255, 59, 48, 0.8)';

        this.perimeterEdges.forEach(edge => {
            const { cx, cy } = this.getHexCenter(edge.x, edge.y);
            const vertices = this.getHexVertices(cx, cy);
            const sideIdx = edge.dir;
            
            const v1 = vertices[sideIdx];
            const v2 = vertices[(sideIdx + 1) % 6];

            this.ctx.beginPath();
            this.ctx.moveTo(v1.x, v1.y);
            this.ctx.lineTo(v2.x, v2.y);
            this.ctx.stroke();
        });

        this.ctx.shadowBlur = 0;
    }
}

// Initialize
window.addEventListener('load', () => {
    window.hexGrid = new HexGrid('hex-grid');
    
    const infoDiv = document.querySelector('.info');
    if (infoDiv) {
        const p = document.createElement('p');
        p.innerHTML = '총 조명 길이: <span id="total-length" style="color: #ff3b30; font-weight: bold; font-size: 1.4em; text-shadow: 0 0 10px rgba(255,59,48,0.5);">0</span>m';
        infoDiv.appendChild(p);
    }
});
