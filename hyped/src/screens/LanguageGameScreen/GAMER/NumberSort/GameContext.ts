
export interface NumberItem {
    id: number | string;
    number: number;
}

export interface RowLayout {
    x: number;
    y: number;
    width: number;
    height: number;
    itemCount: number;
}

// Mutable objects for shared state
export const rowLayouts: {
    current: (RowLayout | null)[],
    scrollOffset: number,
    absoluteY: number
} = {
    current: [],
    scrollOffset: 0,
    absoluteY: 0
};

export const MAX_ITEMS_PER_ROW = 9;
