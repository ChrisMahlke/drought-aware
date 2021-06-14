import React, {useContext} from 'react';

import { AppContext } from '../../contexts/AppContextProvider';
import { UIConfig } from '../../AppConfig';

type Props = {
    isContentVisible: boolean;
}

const CurrentDroughtStatus:React.FC<Props> = ({
                                       isContentVisible,
                                       children
                                   }) => {

    const { isMobile } = useContext(AppContext);

    return (
        <div
            style={{
                display: isContentVisible ? 'block' : 'none',
                lineHeight: 1
            }}
        >
            <div className="column-4 trailer-half leader-quarter">
                <div className="column-3 font-size--3">
                    <div>Current Drought Status</div>
                    <div>(xx/xx/xxxx)</div>
                </div>

                <div className="column-4 font-size-1 avenir-demi" style={{
                    color: UIConfig["exceptional-drought"]
                }}>Exceptional Drought</div>
            </div>

            <div className="">
                { children }
            </div>
        </div>
    )
}

export default CurrentDroughtStatus
