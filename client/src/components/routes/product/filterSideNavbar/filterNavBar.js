import React, {useEffect} from 'react';
import Divider from '@material-ui/core/Divider';
import Drawer from '@material-ui/core/Drawer';
import Hidden from '@material-ui/core/Hidden';
import history from "../../../../history";
import ApparelCheckBox from "./apparelCheckBox";
import log from "loglevel";
import GenderRadioButton from "./genderRadioButton";
import BrandCheckBox from "./brandCheckBox";
import PriceCheckBox from "./priceCheckBox";
import ClearAllButton from "./clearAllButton";
import {connect, useDispatch, useSelector} from "react-redux";
import {loadFilterAttributes} from "../../../../actions";
import {Box} from "@material-ui/core";
import {useFilterNavBarStyles} from "../../../../styles/materialUI/filterNavBarStyles";
import {
    FILTER_ATTRIBUTES, INITIAL_PAGINATION_STATE,
    MAX_PRODUCTS_PER_PAGE
} from "../../../../constants/constants";
import {
    ADD_SELECTED_CATEGORY,
    SAVE_QUERY_STATUS, SAVE_SORT_LIST, SELECT_PRODUCT_PAGE,
} from "../../../../actions/types";
import {PRODUCTS_ROUTE} from "../../../../constants/react_routes";

function FilterNavBar(props) {
    const classes = useFilterNavBarStyles();
    const selectedGenders = useSelector(state => state.selectedFilterAttributesReducer.genders)
    const selectedApparels = useSelector(state => state.selectedFilterAttributesReducer.apparels)
    const selectedBrands = useSelector(state => state.selectedFilterAttributesReducer.brands)
    const selectedPriceRanges = useSelector(state => state.selectedFilterAttributesReducer.prices)
    const selectedFilterAttributes = useSelector(state => state.selectedFilterAttributesReducer)
    const selectedSort = useSelector(state => state.selectSortReducer)
    const selectedPage = useSelector(state => state.selectPageReducer)
    const filterAttributes = useSelector(state => state.filterAttributesReducer)
    const [filterAttributeFromUrlState, setFilterAttributeFromUrlState] = React.useState(false);
    const dispatch = useDispatch()

    const appendQueryIds = attrList => {
        let selectedList = []

        if (attrList.length > 0) {
            attrList.forEach(({id}) => {
                selectedList.push(id)
            })
            return selectedList.join()
        }
        return null
    }

    const prepareQuery = () => {

        let query = []
        let executeDefaultQuery = true

        if (selectedGenders.length > 0) {
            executeDefaultQuery = false
            query.push(`genders=${selectedGenders[0].id}`)
        }

        let idList = appendQueryIds(selectedApparels)
        if (idList) {
            executeDefaultQuery = false
            query.push(`apparels=${appendQueryIds(selectedApparels)}`)
        }

        idList = appendQueryIds(selectedBrands)
        if (idList) {
            executeDefaultQuery = false
            query.push(`brands=${appendQueryIds(selectedBrands)}`)
        }

        idList = appendQueryIds(selectedPriceRanges)
        if (idList) {
            query.push(`prices=${appendQueryIds(selectedPriceRanges)}`)
        }

        if (selectedSort.id > 1) {
            query.push(`sortby=${selectedSort.id}`)
        }

        if (selectedPage) {
            query.push(`page=${(selectedPage.pageNumber - 1) * MAX_PRODUCTS_PER_PAGE},${MAX_PRODUCTS_PER_PAGE}`)
        }

        if (executeDefaultQuery) {
            query.push("category=all")
        }

        if (query.length > 0) {
            log.info(`[FilterNavBar] query is prepared successfully`)
            query = query.join("::")
            return query
        }
        return null
    }

    const dispatchFilterAttributesFromURL = (filterAPIData) => {

        const getObjectFromList = (id, list) => {
            for (let i = 0; i < list.length; i++) {
                if (list[i].id === parseInt(id))
                    return list[i]
            }
            return null
        }

        if (history.location && history.location.pathname.localeCompare(PRODUCTS_ROUTE) === 0) {
            log.info(`[FilterNavBar]: url = ${history.location.search}`)

            let query = history.location.search
            let selectedFilterAttributes = {}
            let filterAttributeIsAdded = false

            let modified_filter_attributes = FILTER_ATTRIBUTES.filter((attribute) => attribute !== "genders")

            modified_filter_attributes.forEach((attribute) => {
                let queryParameters = query.split(`${attribute}=`)

                log.info(`[FilterNavBar] queryParameters = ${JSON.stringify(queryParameters)}`)

                if (queryParameters.length > 1) {

                    // 0th index consist of "?q=" which we are not interested
                    // actual data starts from pIndex=1
                    for (let pIndex = 1; pIndex < queryParameters.length; ++pIndex) {
                        let values
                        try {
                            values = queryParameters[pIndex].split("::")[0].split(",")
                        } catch (e) {
                            log.error("[FilterNavBar] Corrupted URL. Unable to decode url field")
                        }

                        log.info(`[FilterNavBar] values = ${JSON.stringify(values)}`)
                        let selectedAttrList = []
                        if (values.length > 0) {
                            values.forEach(id => {

                                // check if Id is already present or not in the existing
                                // selected list in order to avoid duplicating the entries
                                let attrObject = getObjectFromList(id, filterAPIData[attribute])
                                log.info(`[FilterNavBar] attrObject = ${JSON.stringify(attrObject)}`)
                                if (attrObject) {
                                    selectedAttrList.push({
                                        id: attrObject.id,
                                        value: attrObject.value
                                    })
                                }
                            })

                            log.info(`[FilterNavBar] selectedAttrList = ${JSON.stringify(selectedAttrList)}`)
                            if (selectedAttrList.length > 0) {
                                selectedFilterAttributes = {
                                    ...selectedFilterAttributes,
                                    [attribute]: {
                                        attrList: selectedAttrList
                                    }
                                }
                                filterAttributeIsAdded = true
                            }
                        }
                    }
                }
            })
            if (filterAttributeIsAdded) {
                log.info(`[FilterNavBar] dispatchFilterAttributesFromURL` +
                    `dispatching selectedFilterAttributes=${JSON.stringify(selectedFilterAttributes)}`)
                setFilterAttributeFromUrlState(true)
                dispatch({
                    type: ADD_SELECTED_CATEGORY,
                    payload: selectedFilterAttributes
                })
            }
        }
    }

    const sortByObjValues = (list) => {
        let cloneList = JSON.parse(JSON.stringify(list));

        return cloneList.sort((a, b) =>
            (a.value.charAt(0).toUpperCase() > b.value.charAt(0).toUpperCase()) ? 1 : -1)
    }

    const dispatchSortList = (filterAttr) => {
        let sortListPayload = {}
        sortListPayload.apparels = sortByObjValues(filterAttr.apparels)
        sortListPayload.brands = sortByObjValues(filterAttr.brands)

        dispatch({
            type: SAVE_SORT_LIST,
            payload: sortListPayload
        })
    }

    useEffect(() => {
        log.info("[FilterNavBar] Component did mount for " +
            "selectedApparels, selectedGenders, selectedBrands, selectedPriceRanges.")

        if (!filterAttributes) {
            log.info(`[FilterNavBar] setting selected attributes from URL`)
            let promise = props.loadFilterAttributes(history.location.search);
            promise.then((data) => {

                if (!data) {
                    return
                }

                dispatchFilterAttributesFromURL(data)
                dispatchSortList(data)

            }).catch((message) => {
                log.error(`[FilterNavBar] ${message}}`)
            })

        } else {
            log.info(`[FilterNavBar] prepare query for selectedFilterAttribute`)

            let query = prepareQuery()

            log.info(`[FilterNavBar] newQuery = ${query}, oldQuery = ${selectedFilterAttributes.query}`)

            if (filterAttributes.query || filterAttributeFromUrlState === false) {

                if (filterAttributes.query.localeCompare(query) === 0) {
                    return
                }

                log.info(`[FilterNavBar] dispatching query to SAVE_FILTER_QUERY query = ${query}`)

                props.loadFilterAttributes(`?q=${query}`);

                dispatchSortList(filterAttributes)
            } else {
                setFilterAttributeFromUrlState(false)
            }
        }

        if (selectedPage.pageNumber > 1) {
            dispatch({
                type: SELECT_PRODUCT_PAGE,
                payload: INITIAL_PAGINATION_STATE
            })
        }

        // eslint-disable-next-line
    }, [selectedFilterAttributes]);

    useEffect(() => {
        log.info("[FilterNavBar] Component did mount selectedPage, selectedSort.")

        if (filterAttributes) {
            log.info(`[FilterNavBar] prepare query for selectedPage, selectedSort`)

            let query = prepareQuery()

            if (filterAttributes.query
                && filterAttributes.query.localeCompare(query) === 0) {
                return
            }

            dispatch({
                type: SAVE_QUERY_STATUS,
                payload: query
            })
        }

        // eslint-disable-next-line
    }, [selectedPage, selectedSort]);

    if (!filterAttributes) {
        log.info(`[FilterNavBar] filterAttributes is null.`)
        return null
    }

    const renderDrawerComponents = (component) => {
        return (
            <>
                <Box display="flex" flexDirection="column" px={1} pl={3}>
                    <Box>
                        {component}
                    </Box>
                </Box>
                <Divider/>
            </>
        )
    }

    const drawer = (
        <>
            <Box display="flex" p={2} style={{
                position: 'sticky', top: 0, backgroundColor: 'white',
                fontWeight: "bold", fontSize: "1.2rem", zIndex: 1040
            }}>
                <Box alignSelf="center" flex="1">FILTERS</Box>
                <Box alignSelf="center"><ClearAllButton/></Box>
            </Box>
            <Divider/>

            {renderDrawerComponents(<GenderRadioButton/>)}
            {renderDrawerComponents(<ApparelCheckBox/>)}
            {renderDrawerComponents(<BrandCheckBox/>)}
            {renderDrawerComponents(<PriceCheckBox/>)}
        </>
    );

    log.info("[FilterNavBar] Rendering FilterNavBar Component.")

    return (
        <div className={classes.root}>
            <nav className={classes.drawer}>
                <Hidden smDown implementation="css">
                    <Drawer
                        classes={{
                            paper: classes.drawerPaper,
                        }}
                        variant="permanent"
                        open>
                        {drawer}
                    </Drawer>
                </Hidden>
            </nav>
        </div>
    );
}

export default connect(null, {loadFilterAttributes})(FilterNavBar);
