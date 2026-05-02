(() => {
    const SIZE = 4;
    let grid, score, best, prevGrid, prevScore, prevMoves, won;
    let movesCount = 0, largestTile = 2;

    const $ = id => document.getElementById(id);
    const scoreEl   = $('score');
    const bestEl    = $('best');
    const movesEl   = $('moves');
    const largestEl = $('largest');
    const tilesEl   = $('board-tiles');
    const overlay   = $('overlay');
    const overlayTitle = $('overlay-title');
    const overlaySub   = $('overlay-sub');

    // bit buggy
    const bgEl = $('board-bg');
    for (let i = 0; i < SIZE * SIZE; i++) {
        const d = document.createElement('div');
        d.className = 'cell-bg';
        bgEl.appendChild(d);
    }

    function emptyGrid() { return Array.from({ length: SIZE }, () => Array(SIZE).fill(0)); }
    function cloneGrid(g) { return g.map(r => [...r]); }

    function addRandom(g) {
        const empty = [];
        g.forEach((row, r) => row.forEach((v, c) => { if (!v) empty.push([r, c]); }));
        if (!empty.length) return false;
        const [r, c] = empty[Math.floor(Math.random() * empty.length)];
        g[r][c] = Math.random() < 0.9 ? 2 : 4;
        return true;
    }

    function recomputeLargest() {
        let max = 2;
        grid.forEach(row => row.forEach(v => { if (v > max) max = v; }));
        largestTile = max;
    }

    function init() {
        grid = emptyGrid();
        score = 0;
        won = false;
        prevGrid = null;
        prevScore = 0;
        prevMoves = 0;
        movesCount = 0;
        largestTile = 2;
        addRandom(grid);
        addRandom(grid);
        best = parseInt(localStorage.getItem('2048best') || '0');
        overlay.classList.remove('show');
        render();
        updateScores();
    }

    function slideRow(row) {
        let vals = row.filter(v => v), merged = [], gained = 0;
        for (let i = 0; i < vals.length; i++) {
            if (i + 1 < vals.length && vals[i] === vals[i + 1]) {
                const m = vals[i] * 2;
                merged.push({ val: m, isMerge: true });
                gained += m; i++;
            } else {
                merged.push({ val: vals[i], isMerge: false });
            }
        }
        while (merged.length < SIZE) merged.push({ val: 0, isMerge: false });
        return { cells: merged, gained };
    }

    function move(dir) {
        const snapGrid = cloneGrid(grid);
        const snapScore = score;
        const snapMoves = movesCount;
        let moved = false, merges = [], gained = 0;

        const rotate     = g => g[0].map((_, c) => g.map(r => r[c]).reverse());
        const rotateBack = g => g[0].map((_, c) => g.map(r => r[SIZE - 1 - c]));

        let g = cloneGrid(grid);
        if (dir === 'up')    g = rotateBack(g);
        if (dir === 'down')  g = rotate(g);
        if (dir === 'right') g = g.map(r => [...r].reverse());

        g = g.map((row, r) => {
            const { cells, gained: g2 } = slideRow(row);
            gained += g2;
            row.forEach((v, c) => {
                if (v !== cells[c].val) moved = true;
                if (cells[c].isMerge) merges.push([r, c]);
            });
            return cells.map(x => x.val);
        });

        if (dir === 'up')    g = rotate(g);
        if (dir === 'down')  g = rotateBack(g);
        if (dir === 'right') g = g.map(r => [...r].reverse());

        if (!moved) return;

        prevGrid = snapGrid;
        prevScore = snapScore;
        prevMoves = snapMoves;
        score += gained;
        movesCount += 1;
        if (score > best) {
            best = score;
            localStorage.setItem('2048best', best);
        }
        grid = g;
        addRandom(grid);
        recomputeLargest();
        render(merges);
        updateScores();
        checkEnd();
    }

    function canMove(g) {
        for (let r = 0; r < SIZE; r++)
            for (let c = 0; c < SIZE; c++) {
                if (!g[r][c]) return true;
                if (c + 1 < SIZE && g[r][c] === g[r][c+1]) return true;
                if (r + 1 < SIZE && g[r][c] === g[r+1][c]) return true;
            }
        return false;
    }

    function checkEnd() {
        if (!won && grid.some(r => r.includes(2048))) {
            won = true;
            overlayTitle.textContent = '\u2605 YOU WIN \u2605';
            overlaySub.textContent = 'You reached 2048. Keep merging for a higher score?';
            $('overlay-btn').textContent = '[ keep playing ]';
            overlay.classList.add('show');
            return;
        }
        if (!canMove(grid)) {
            overlayTitle.textContent = 'GAME OVER';
            overlaySub.textContent = 'Final score: ' + score + ' \u00B7 ' + movesCount + ' moves \u00B7 best tile: ' + largestTile;
            $('overlay-btn').textContent = '[ play again ]';
            overlay.classList.add('show');
        }
    }

    function tileClass(val) {
        if (!val) return 't-0';
        if (val <= 2048) return 't-' + val;
        return 't-high';
    }

    function render(merges = []) {
        tilesEl.innerHTML = '';
        const mergeSet = new Set(merges.map(([r, c]) => r * SIZE + c));
        grid.forEach((row, r) => row.forEach((val, c) => {
            const d = document.createElement('div');
            d.className = 'tile ' + tileClass(val);
            if (mergeSet.has(r * SIZE + c) && val) d.classList.add('merged');
            d.textContent = val || '';
            tilesEl.appendChild(d);
        }));
    }

    function updateScores() {
        scoreEl.textContent   = score;
        bestEl.textContent    = best;
        movesEl.textContent   = movesCount;
        largestEl.textContent = largestTile;
    }

    document.addEventListener('keydown', e => {
        const map = {
            ArrowUp:'up', ArrowDown:'down', ArrowLeft:'left', ArrowRight:'right',
            w:'up', s:'down', a:'left', d:'right',
            W:'up', S:'down', A:'left', D:'right'
        };
        if (map[e.key]) { e.preventDefault(); move(map[e.key]); }
    });

    let tx = 0, ty = 0;
    const board = $('board-wrap');
    board.addEventListener('touchstart', e => {
        tx = e.touches[0].clientX;
        ty = e.touches[0].clientY;
    }, { passive: true });
    board.addEventListener('touchend', e => {
        const dx = e.changedTouches[0].clientX - tx;
        const dy = e.changedTouches[0].clientY - ty;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
        if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'right' : 'left');
        else move(dy > 0 ? 'down' : 'up');
    }, { passive: true });

    $('new-btn').addEventListener('click', init);
    $('undo-btn').addEventListener('click', () => {
        if (!prevGrid) return;
        grid = prevGrid;
        score = prevScore;
        movesCount = prevMoves;
        prevGrid = null;
        recomputeLargest();
        overlay.classList.remove('show');
        render();
        updateScores();
    });
    $('overlay-btn').addEventListener('click', () => {
        if (won && canMove(grid)) {
            overlay.classList.remove('show');
            won = false;
        } else {
            init();
        }
    });

    init();
})();