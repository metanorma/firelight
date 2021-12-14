// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import { useEffect, useMemo, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import ContentSection from './ContentSection';
import Cover from './Cover';
import { getChildsById } from '../utility';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

interface OwnProps {
    xmlData: any;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function MainPage({ xmlData }: OwnProps) {
    let location = useLocation();
    const [page, setPage] = useState(0);
    const [contents, setContents] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    // split the xml data by content section and save those as array
    const contentSections = useMemo(() => {
        const getMenuItem = (data: any): any => {
            const returnData: any = {};
            returnData.index = data['$']['displayorder'];
            returnData.data = data;
            return returnData;
        };

        const menuItem: any[] = [];
        if (xmlData['bsi-standard']) {
            //the foreword part
            const foreword = getMenuItem(
                xmlData['bsi-standard']['preface'][0]['foreword'][0]
            );
            menuItem[foreword.index] = foreword;
            // menuItem.push(foreword);
            //the introduction part
            const introduction = getMenuItem(
                xmlData['bsi-standard']['preface'][0]['introduction'][0]
            );
            menuItem[introduction.index] = introduction;
            // menuItem.push(introduction);
            //the introduction part
            const references = getMenuItem(
                xmlData['bsi-standard']['bibliography'][0]['references'][0]
            );
            menuItem[references.index] = references;
            // menuItem.push(references);
            //the terms part
            const terms = getMenuItem(
                xmlData['bsi-standard']['sections'][0]['terms'][0]
            );
            menuItem[terms.index] = terms;
            // menuItem.push(terms)
            // the sction part
            const sections = xmlData['bsi-standard']['sections'][0]['clause'];
            if (sections?.length) {
                sections.map((sectoin: any) => {
                    const sectionItem = getMenuItem(sectoin);
                    menuItem[sectionItem.index] = sectionItem;
                    // menuItem.push(sectionItem);
                });
            }
            //the sction part
            const annex = xmlData['bsi-standard']['annex'];
            if (annex?.length) {
                annex.map((sectoin: any) => {
                    const sectionItem = getMenuItem(sectoin);
                    menuItem[sectionItem.index] = sectionItem;
                    // menuItem.push(sectionItem)
                });
            }
            //the bibliography part
            const bibliography = getMenuItem(
                xmlData['bsi-standard']['bibliography'][0]['clause'][0]
            );
            menuItem[bibliography.index] = bibliography;
        }
        const resultArray: any[] = [];
        menuItem.map((item: any) => {
            if (item?.data) resultArray.push(item);
        });
        return resultArray;
    }, [xmlData]);

    const loader = useRef<HTMLDivElement | null>(null);
    // here we handle what happens when user scrolls to Load More div
    // in this case we just update page variable
    const handleObserver = (entities: any) => {
        const target = entities[0];
        if (target.isIntersecting) {
            console.log(target.isIntersecting, 'intersecting');
            setPage((_page) => _page + 1);
        }
    };

    useEffect(() => {
        const options = {
            root: null,
            rootMargin: '20px',
            threshold: 1.0
        };
        // initialize IntersectionObserver and attaching to Load More div
        const observer = new IntersectionObserver(handleObserver, options);
        if (loader.current) {
            observer.observe(loader.current);
        }
    }, []);

    useEffect(() => {
        if (contentSections?.length && !contents[page]) {
            if (page && page < contentSections.length) {
                const newContent = contents;
                newContent[page] = contentSections[page];
                setContents(newContent);
            } else if (page === 0) {
                setContents([contentSections[0]]);
            }
        }
    }, [page, contentSections]);

    useEffect(() => {
        if (loader.current) {
            setLoading(false);
            console.log('true loading');
        }
    }, [loader]);
    
    useEffect(() => {
        const hash: string = location.hash.substr(1);
        //find the id in contentSections
        const index: number = contentSections.findIndex((item: any) => {
            return item?.data?.$?.id === hash;
        });
        console.log(index, 'hash', hash);
        if (index !== -1 && !contents[index]) {
            console.log('already')
            const newContent = contents;
            newContent[page] = contentSections[page];
            setContents(newContent);
        }
    }, [location]);

    return (
        <div className="main-page">
            <Cover />
            {contents?.length > 0 &&
                contents.map((item: any) => (
                    <ContentSection xmlData={item.data} key={item.index} />
                ))}
            <div ref={loader} className="load-more"></div>
        </div>
    );
}
