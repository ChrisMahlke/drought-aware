import React, { useContext, useState } from 'react';

import { AppContext } from '../../contexts/AppContextProvider';
import { UIConfig } from '../../AppConfig';

type Props = {
    isExpanded: boolean;
    isContentVisible: boolean;
}

const BottomBar:React.FC<Props> = ({
    isExpanded,
    isContentVisible,
    children
}) => {

    const { isMobile } = useContext(AppContext);

    return (
        <div
            style={{
                'position': 'absolute',
                'bottom': 200,
                'height': '30px',
                'overflowY': 'hidden',
                'overflowX': 'hidden',
                'width': isMobile ? 'unset' : "20%",
                'boxSizing': 'border-box',
                'background': UIConfig["sidebar-background"],
                'color': UIConfig["sidebar-text-color"],
                'zIndex': 5
            }}
        >
            <div
                style={{
                    display: isContentVisible ? 'block' : 'none'
                }}
            >
                <div 
                    className=""
                    style={{
                        padding: '.5rem 1rem 1rem'
                    }}
                >
                    { children }
                </div>
            </div>
        </div>
    )
}

export default BottomBar
