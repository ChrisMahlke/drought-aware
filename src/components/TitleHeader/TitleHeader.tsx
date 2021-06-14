import React, { useContext, useState } from 'react';

import { AppContext } from '../../contexts/AppContextProvider';
import { UIConfig } from '../../AppConfig';
import InformationIcon from "calcite-ui-icons-react/InformationIcon";

type Props = {
    isExpanded: boolean;
}

const TitleHeader:React.FC<Props> = ({
                                     isExpanded,
                                     children
                                 }) => {

    const { isMobile } = useContext(AppContext);

    return (
        <div
            style={{
                'position': 'absolute',
                'left': 0,
                'top': !isMobile ? 0: 'unset',
                'bottom': isExpanded || isMobile ? 0 : 'unset',
                'maxHeight': '125px',
                'right': isMobile ? 0 : 'unset',
                'overflowY': 'hidden',
                'overflowX': 'hidden',
                'boxSizing': 'border-box',
                'background': UIConfig["sidebar-background"],
                'color': UIConfig["text-color"],
                'zIndex': 5
            }}
        >
            <div>
                <div
                    style={{
                        backgroundColor: UIConfig["sidebar-background-opaque"],
                        padding: '.5rem 1rem'
                    }}
                >
                    <div className="">
                        <div>
                            <span className="font-size-6" style={{
                                'color': UIConfig["main-title-component-text-color"],
                                'textShadow': '1px 1px 2px #6F3F14'
                            }}>
                            Esri Drought Aware
                        </span>
                            <span className="padding-left-half"><InformationIcon size={26} /></span>
                        </div>
                        <div className='font-size-1' style={{'color': UIConfig["main-subtitle-component-text-color"]}}>Statistics and impacts of drought in the U.S.A.</div>
                        <div className='font-size--3' style={{'color': UIConfig["main-source-component-text-color"]}}>Source: NOAA, Census, USDA</div>
                    </div>
                </div>

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

export default TitleHeader
