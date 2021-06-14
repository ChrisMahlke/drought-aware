import React, {useContext} from 'react';

import { AppContext } from '../../contexts/AppContextProvider';
import { UIConfig } from '../../AppConfig';

type Props = {
    isContentVisible: boolean;
}

const SeasonalDroughtOutlook:React.FC<Props> = ({
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
            <div className="column-4 trailer-0 leader-quarter">
                <div className="column-3 font-size--3">
                    <div>Seasonal Drought Outlook</div>
                    <div>(xx/xx/xxxx)</div>
                </div>
                <div className="column-4 font-size-1 avenir-demi" style={{
                    color: '#3da02c'
                }}>Drought Improves</div>
            </div>

            <div className="">
                { children }
            </div>
        </div>
    )
}

export default SeasonalDroughtOutlook
