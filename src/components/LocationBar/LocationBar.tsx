import React, { useContext, useState } from 'react';

import { AppContext } from '../../contexts/AppContextProvider';
import { UIConfig } from '../../AppConfig';

type Props = {
    isExpanded: boolean;
    isLoading: boolean;
    isContentVisible: boolean;
}

const LocationBar:React.FC<Props> = ({
                                     isExpanded,
                                     isLoading,
                                     isContentVisible,
                                     children
                                 }) => {

    const { isMobile } = useContext(AppContext);

    return (
        <div
            style={{
                'position': 'absolute',
                'bottom': 0,
                'height': '200px',
                'overflowY': 'auto',
                'overflowX': 'hidden',
                'width': isMobile ? 'unset' : UIConfig["bottom-panel-width"],
                'boxSizing': 'border-box',
                'background': UIConfig["sidebar-background"],
                'color': UIConfig["text-color"],
                'zIndex': 5
            }}
        >
            <div
                style={{
                    display: isContentVisible ? 'block' : 'none'
                }}
            >


                <div
                    className="trailer-quarter"
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

export default LocationBar
