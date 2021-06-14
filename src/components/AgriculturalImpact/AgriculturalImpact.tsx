import React, {useContext} from 'react';

import { AppContext } from '../../contexts/AppContextProvider';
import { UIConfig } from '../../AppConfig';

type Props = {
    isContentVisible: boolean;
}

const AgriculturalImpact:React.FC<Props> = ({
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
                <div className="column-4">
                    <div className="font-size-1 avenir-demi">Agricultural Impact</div>
                    <div className="font-size--3">XX,XXX jobs</div>
                </div>
                <div className="column-4 leader-quarter font-size--3" style={{
                    lineHeight: 1.3
                }}>
                    <div>Total Sales: xx,xxx,xxx</div>
                    <div>Corn: $xx,xxx,xxx</div>
                    <div>Soy: $xx,xxx,xxx</div>
                    <div>Hay: $xxx,xxx</div>
                    <div>Winter wheat: $xx,xxx,xxx</div>
                    <div>Livestock: $xx,xxx,xxx</div>
                </div>
            </div>

            <div className="">
                { children }
            </div>
        </div>
    )
}

export default AgriculturalImpact
