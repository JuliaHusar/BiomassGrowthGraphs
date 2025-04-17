import React from 'react';

const Circle = ({ cx, cy, r, fill, onMouseOver, onMouseOut, onClick }) => {
    return (
        <circle
            cx={cx}
            cy={cy}
            r={r}
            fill={fill}
            onMouseOver={onMouseOver}
            onMouseOut={onMouseOut}
            onClick={onClick}
        />
    );
};

export default Circle;