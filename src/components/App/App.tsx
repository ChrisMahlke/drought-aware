import React, { useState, useEffect, useRef } from 'react'
import MapView from '../MapView/MapView';
import LocationBar from "../LocationBar/LocationBar";
import BottomBar from '../BottomBar/BottomBar';

import CurrentDroughtStatus from "../CurrentDroughtStatus/CurrentDroughtStatus";
import DroughtOutlook from "../DroughtOutlook/DroughtOutlook";
import ConsecutiveWeeks from "../ConsecutiveWeeks/ConsecutiveWeeks";
import SeasonalDroughtOutlook from "../SeasonalOutlook/SeasonalDroughtOutlook";
import AgriculturalImpact from "../AgriculturalImpact/AgriculturalImpact";

import TitleHeader from "../TitleHeader/TitleHeader";
import ReverseGeocodingResultText from '../ReverseGeocodingResultText/ReverseGeocodingResultText';
import AppConfig from '../../AppConfig';
import { QueryLocation } from 'air-quality-aware';
import { ReverseGeocodingResult, reverseGeocode } from  '../../utils/reverseGeocoding'

const App = () => {
    // [state variable, function used to update state variable]
    const [ isBottomBarExpanded, setIsBottomBarExpanded ] = useState<boolean>();
    const [ isLoading, setIsLoading ] = useState<boolean>(false);
    const [ isBottomBarContentVisible, setIsBottomBarContentVisible ] = useState<boolean>(true);
    const [ reverseGeocodingResult, setReverseGeocodingResult ] = useState<ReverseGeocodingResult>();

    const queryAppData = async(location:QueryLocation) => {
        if (!isBottomBarExpanded) {
            setIsBottomBarExpanded(true);
        }
        
        setIsLoading(true);
        setReverseGeocodingResult(undefined);

        try {
            const reverseGeocodingResult = await reverseGeocode(location);
            setReverseGeocodingResult(reverseGeocodingResult);

            if (!reverseGeocodingResult.error && reverseGeocodingResult.address.City.length > 0) {
                // open sidebar first in mobile view before rendering components inside of it
                setIsBottomBarContentVisible(true);
            }
        } catch(err) {
            console.log(err);
        }
        setIsLoading(false);
    }

    return (
        <>
            <MapView 
                webmapId={AppConfig["webmap-id"]}
                onClickHandler={queryAppData}
            >
            </MapView>

            <TitleHeader
                isExpanded={true}>
            </TitleHeader>

            <BottomBar
                isExpanded={isBottomBarExpanded}
                isContentVisible={isBottomBarContentVisible}>
                <ReverseGeocodingResultText
                    data={reverseGeocodingResult}
                />
            </BottomBar>

            <LocationBar
                isExpanded={true}
                isLoading={true}
                isContentVisible={true}>
                <div className="column-4 padding-left-0">
                    <CurrentDroughtStatus isContentVisible={true}></CurrentDroughtStatus>
                    <DroughtOutlook isContentVisible={true}></DroughtOutlook>
                </div>
                <div className="column-4 padding-left-0">
                    <ConsecutiveWeeks isContentVisible={true}></ConsecutiveWeeks>
                    <SeasonalDroughtOutlook isContentVisible={true}></SeasonalDroughtOutlook>
                </div>
                <div className="column-4 padding-left-0">
                    <AgriculturalImpact isContentVisible={true}></AgriculturalImpact>
                </div>
            </LocationBar>
        </>
    )
}

export default App
