const layout = [
    "layout1",
    "layout2",
    "layout3",
    "layout4",
    "layout5",
    "layout6",
    "layout7",
    "layout8",
    "layout9",
    "layout10",
    "layout11",
    "layout12"
];

export const getRandomLayout = () => {
    const randomIndex = Math.floor(Math.random() * layout.length);
    return layout[randomIndex];
};